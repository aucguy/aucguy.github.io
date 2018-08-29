const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const crypto = require('crypto');
const gulp = require('gulp');
const pump = require('pump');
const uglify = require('gulp-uglify');
const extReplace = require('gulp-ext-replace');
const gulp_ejs = require('gulp-ejs');
const ejs = require('ejs');
const markdown = require('markdown').markdown;
const through2 = require('through2');
const Vinyl = require('vinyl');
const glob = require('glob');
const del = require('del');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'];

const POSTS_PER_PAGINATE = 3;

function promisify(func) {
	return function() {
		var self = this;
		var args = Array.from(arguments);
		return new Promise((resolve, reject) => {
			args.push((err, data) => {
				if(err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
			func.apply(self, args);
		});
	};
}

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const lstat = promisify(fs.lstat);
const globPromise = promisify(glob);
const exec = promisify(child_process.exec);

async function exists(pathname) {
	return new Promise((resolve, reject) => {
		fs.access(pathname, function(err) {
			if(err) {
				return resolve(false);
			} else {
				return resolve(true);
			}
		});
	});
}

async function readSite() {
	var data = await readFile('config.json');
	var site = JSON.parse(data.toString());
	
	var lib = {
		includePage: function(file, args, noPreprocess) {
			var data = fs.readFileSync(file).toString();
			if(noPreprocess) {
				return data;
			} else {
				return ejs.render(data.toString(), {
					lib,
					args,
					site
				});
			}
		},
		include: function(file, args) {
			return lib.includePage(path.join('includes', file), args);
		},
		date: function(date) {
			var parts = date.split('-');
			return MONTHS[parseInt(parts[1]) - 1] + ' ' + parts[2] + ', ' + parts[0];
		},
		markdown: function(content) {
			return markdown.toHTML(content);
		}
	}
	
	return {
		lib,
		site,
		args: null
	};
}

async function compileTemplate(pathname) {
	var data = await readFile(path.join('includes', pathname));
	return ejs.compile(data.toString());
}

async function formatPost(ejsData, postTemplatePath) {
	var postTemplate = await compileTemplate(postTemplatePath);
	return through2.obj(function(file, enc, callback) {
		var parts = path.basename(file.path).split('-');
		var date = parts[0] + '-' + parts[1] + '-' + parts[2];
		
		parts = splitFrontMatter(file.contents.toString(enc));
		var data = Object.assign({ date, frontMatter: parts.frontMatter }, ejsData);
		var content = ejs.render(markdown.toHTML(parts.body), data);
		data = Object.assign({ content }, data);
		
		this.push(new Vinyl({
			cwd: file.cwd,
			base: file.base,
			path: file.path,
			contents: Buffer.from(postTemplate(data), enc)
		}));
		callback();
	});
}

function splitFrontMatter(str) {
	if(str.trim().startsWith('---')) {
		var beginIndex = str.indexOf('---');
		endIndex = str.indexOf('---', beginIndex + 1);
		if(endIndex == -1) {
			return {
				frontMatter: {},
				body: str
			};
		} else {
			var frontMatterStr = str.substring(beginIndex + '---'.length, endIndex);
			var frontMatter = {};
			for(var line of frontMatterStr.split(/[\n\r]+/g)) {
				var colonIndex = line.indexOf(':');
				if(colonIndex != -1) {
					var parts = line.split(':');
					frontMatter[parts[0].trim()] = parts[1].trim();
				}
			}
			return {
				frontMatter,
				body: str.substring(endIndex + '---'.length)
			};
		}
	} else {
		return {
			frontMatter: {},
			body: str
		};
	}
}

async function generatePaginates(ejsData) {
	var files = await globPromise('public/posts/**/*.html');
	files.sort(function(a, b) {
		var partsA = a.split('-');
		var partsB = b.split('-');
		for(var i = 0; i < 3; i++) {
			if(partsA[i] < partsB[i]) {
				return -1;
			} else if(partsA[i] > partsB[i]) {
				return 1;
			}
		}
		//TODO remove this restriction
		throw('multi posts per day not allowed');
	});
	files.reverse(); //so its newest to oldest
	
	await mkdirs('public/paginates');
	var paginateTemplate = await compileTemplate('paginate.html');
	var standalonePaginateTemplate = await compileTemplate('standalonePaginate.html');
	var numPaginates = Math.ceil(files.length / POSTS_PER_PAGINATE);
	for(var i = 0; i < numPaginates; i++) {
		var nextPage;
		if(i == numPaginates - 1) {
			nextPage = 'null';
			nextStandalonePage = 'null';
		} else {
			nextPage = `/paginates/paginate${i + 1}.html`;
			nextStandalonePage = `/paginates/standalonePaginate${i + 1}.html`;
		}
		var posts = files.slice(i * numPaginates, (i + 1) * numPaginates);
		var data = Object.assign({
			paginator: {
				nextPage,
				nextStandalonePage,
				posts,
				page: i,
				totalPages: numPaginates
			}
		}, ejsData);
		var contents = paginateTemplate(data);
		await writeFile(`public/paginates/paginate${i}.html`, contents);
		
		contents = standalonePaginateTemplate(data);
		await writeFile(`public/paginates/standalonePaginate${i}.html`, contents);
	}
}

async function globFiles(globPattern, ignore) {
	return await globPromise(globPattern, {
		ignore
	});
}

async function lastModified(files) {
	var lastModified = 0;
	for(var file of files) {
		var stat = await lstat(file);
		if(stat.mtimeMs > lastModified) {
			lastModified = stat.mtimeMs;
		}
	}
	return lastModified;
}

function contentHash(files) {
	var hash = crypto.createHash('sha256');
	for(var file of files) {
		hash.update(file);
		hash.update(',');
	}
	return hash.digest('hex');
}

async function outputBuild(outputBuild, oldSiteData) {
	var newSiteData = {};
	for(var build of outputBuild) {
		var buildDir = path.join(build.dir, build.build, '**/*');
		var excludeDir = path.join(build.dir, build.exclude);
		var files = await globFiles(path.join(build.dir, '**/*'), [buildDir, excludeDir]);
		
		var modified = await lastModified(files);
		var hash = contentHash(files);
		var saved = oldSiteData[build.dir];
		
		if(!saved ||
				modified > saved.lastModified || 
				hash !== saved.contentHash) {
			console.log('building ' + build.dir);
			await exec(build.cmd, {
				cwd: build.dir
			});
			var files = await globFiles(path.join(build.dir, '**/*'), [buildDir, excludeDir]);
			modified = await lastModified(files);
			hash = contentHash(files);
		}
		newSiteData[build.dir] = {
			lastModified: modified,
			contentHash: hash
		};
		gulp.src(buildDir).pipe(gulp.dest(path.join('public', build.output)));
	}
	return newSiteData;
}

async function mkdirs(pathname) {
	if(!await exists(pathname)) {
		await mkdirs(path.dirname(pathname));
		await mkdir(pathname);
	}
}

async function build() {
	await del('public/**/*');
	
	pump([
		gulp.src('src/**/*.js'),
		uglify(),
		gulp.dest('public')
	]);
	
	gulp.src(['src/**/*', '!**/*.js', '!**/*.html'])
		.pipe(gulp.dest('public'));
	
	var ejsData = await readSite();
	gulp.src('posts/**/*.md')
		.pipe(await formatPost(ejsData, 'post.html'))
		.pipe(extReplace('.html'))
		.pipe(gulp.dest('public/posts'))
		.on('end', async function() {
			await generatePaginates(ejsData);
			//pump silently swallows errors
			gulp.src('src/**/*.html')
				.pipe(gulp_ejs(ejsData))
				.pipe(gulp.dest('public'));
		});
	
	//generate tabs
	var site = ejsData.site;
	if(site.tabs) {
		var tabPath = site.tabs.tab_path;
		var tabTemplate = await compileTemplate(site.tabs.tab_template);
		var itemPath = site.tabs.item_path;
		var itemTemplate = await compileTemplate(site.tabs.item_template);
		
		for(var name in site.tabs.items) {
			var info = Object.assign({name}, site.tabs.items[name]);
			var data = Object.assign({tab: info}, ejsData);
			var pathname = path.join('public', tabPath.replace(':name', info.name));
			
			await mkdirs(path.dirname(pathname));
			await writeFile(pathname, tabTemplate(data));
			
			if(site.tabs.items[name].items) {
				for(var itemname in site.tabs.items[name].items) {
					var iteminfo = Object.assign({name: itemname, tab: name}, site.tabs.items[name].items[itemname]);
					var itemdata = Object.assign({tab: iteminfo}, ejsData);
					pathname = path.join('public', itemPath.replace(':name', iteminfo.name).replace(':tab', iteminfo.tab));
					await mkdirs(path.dirname(pathname));
					await writeFile(pathname, itemTemplate(itemdata));
				}
			}
		}
	}
	
	var oldSiteData;
	if(await exists('siteData.json')) {
		oldSiteData = JSON.parse(await readFile('siteData.json'));
	} else {
		oldSiteData = {};
	}
	
	var newSiteData = {};
	if(site.outputBuild) {
		newSiteData.outputBuild = await outputBuild(site.outputBuild, oldSiteData.outputBuild || {});
	}
	await writeFile('siteData.json', JSON.stringify(newSiteData));
	console.log('finished build');
}

gulp.task('build', () => {
	build().catch((err) => {
		throw(err);
	});
});