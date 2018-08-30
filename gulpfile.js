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

async function mkdirs(pathname) {
	if(!await exists(pathname)) {
		await mkdirs(path.dirname(pathname));
		await mkdir(pathname);
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

function strToTime(str) {
	var parts = str.split('-');
	if(parts.length !== 3 && parts.length !== 5) {
		throw(new Error('invalid date'));
	}
	return {
		year: parts[0],
		month: parts[1],
		day: parts[2],
		hour: parts[3],
		minute: parts[4]
	};
}

function timeToStr(time) {
	var str = `${MONTHS[time.month - 1]} ${time.day}, ${time.year}`;
	if(time.hour && time.minute) {
		var pm = time.hour > 12;
		var hour = pm ? time.hour - 12 : time.hour;
		str = `${str} ${hour}:${time.minute} ${pm ? 'PM' : 'AM'}`;
	}
	return str;
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
			return timeToStr(strToTime(date));
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

function splitFrontMatter(str) {
	var beginIndex = str.indexOf('---');
	var endIndex = str.indexOf('---', beginIndex + 1);
	if(!str.trim().startsWith('---') || endIndex === -1) {
		return {
			frontMatter: {},
			body: str
		}
	}
	
	var frontMatter = {};
	var frontMatterStr = str.substring(beginIndex + '---'.length, endIndex);
	for(var line of frontMatterStr.split(/[\n\r]+/g)) {
		var parts = line.split(':');
		if(parts.length > 1) {
			frontMatter[parts[0].trim()] = parts[1].trim();
		}
	}
	return {
		frontMatter,
		body: str.substring(endIndex + '---'.length)
	};
}

async function formatPost(ejsData, postTemplatePath) {
	var postTemplate = await compileTemplate(postTemplatePath);
	var postData = {};
	return through2.obj(function(file, enc, callback) {
		var parts = splitFrontMatter(file.contents.toString(enc));
		var data = Object.assign({ frontMatter: parts.frontMatter }, ejsData);
		var content = ejs.render(markdown.toHTML(parts.body), data);
		data.content = content;
		
		var key = path.relative(file.base, file.path).replace(/[.]md$/, '');
		if(key in postData) {
			throw(new Error(`duplicate post name: ${key}`));
		}
		postData[key] = parts.frontMatter.date;
		
		this.push(new Vinyl({
			cwd: file.cwd,
			base: file.base,
			path: file.path,
			contents: Buffer.from(postTemplate(data), enc)
		}));
		callback();
	}, function(callback) {
		mkdirs('build/posts').then(() => {
			return writeFile('build/postDates.json', JSON.stringify(postData));
		}).then(callback);
	});
}

async function getPosts() {
	var files = await globPromise('public/posts/**/*.html');
	var postData = JSON.parse(await readFile('build/postDates.json'));
	files.sort(function(a, b) {
		debugger;
		var partsA = postData[path.basename(a, '.html')].split('-').map(Number);
		var partsB = postData[path.basename(b, '.html')].split('-').map(Number);
		for(var i = 0; i < 5; i++) {
			if(partsA[i] === undefined || partsB[i] === undefined) {
				break;
			}
			if(partsA[i] < partsB[i]) {
				return -1;
			} else if(partsA[i] > partsB[i]) {
				return 1;
			}
		}
		throw(`ambigious time order for ${a} and ${b}`);
	});
	files.reverse(); //so its newest to oldest
	return files;
}

async function createPaginateType(config) {
	return {
		template: await compileTemplate(config.template),
		path: config.output
	};
}

function nextPage(template, i, totalPages) {
	if(i === totalPages - 1) {
		return 'null';
	} else {
		return template.path.replace('${i}', i + 1);
	}
}

async function writePaginate(template, data, i) {
	var contents = template.template(data);
	var pathname = path.join('public', template.path.replace('${i}', i));
	await writeFile(pathname, contents);
}

async function generatePaginates(ejsData) {
	var config = ejsData.site.paginate;
	if(!config) {
		throw(new Error('paginate config not found'));
	}
	var files = await getPosts();
	await mkdirs('public/paginates');
	
	var embeddedTemplate = await createPaginateType(config.embedded);
	var standaloneTemplate = await createPaginateType(config.standalone);
	
	var totalPages = Math.ceil(files.length / POSTS_PER_PAGINATE);
	for(var i = 0; i < totalPages; i++) {
		var data = Object.assign({
			paginator: {
				nextPage: nextPage(embeddedTemplate, i, totalPages),
				nextStandalonePage: nextPage(standaloneTemplate, i, totalPages),
				posts: files.slice(i * totalPages, (i + 1) * totalPages),
				page: i,
				totalPages
			}
		}, ejsData);
		await writePaginate(embeddedTemplate, data, i);
		await writePaginate(standaloneTemplate, data, i);
	}
}

async function createRepo(data, oldSiteData) {
	var obj = {
		repoDir: data.dir,
		repoDirGlob: path.join(data.dir, '**/*'),
		buildDir: path.join(data.dir, data.build, '**/*'),
		outputDir: path.join(data.output),
		cmd: data.cmd,
		lastModified: oldSiteData[data.dir] ? oldSiteData[data.dir].lastModified : -1,
		contentHash: oldSiteData[data.dir] ? oldSiteData[data.dir].contentHash : null,
		excludes: null,
		files: null
	};
	obj.excludes = [obj.buildDir, path.join(data.dir, data.exclude)];
	obj.files = await globFiles(obj.repoDirGlob, obj.excludes);
	return obj;
}

function needsRebuild(repo, modified, hash) {
	return modified > repo.lastModified || hash !== repo.contentHash;
}

async function outputBuild(outputBuild, oldSiteData) {
	var newSiteData = {};
	for(var repoData of outputBuild) {
		var repo = await createRepo(repoData, oldSiteData);
		var modified = await lastModified(repo.files);
		var hash = contentHash(repo.files);
		
		if(needsRebuild(repo, modified, hash)) {
			console.log('building ' + repo.repoDir);
			await exec(repo.cmd, {
				cwd: repo.repoDir
			});
			var files = await globFiles(repo.repoDirGlob, repo.excludes);
			modified = await lastModified(files);
			hash = contentHash(files);
		}
		newSiteData[repo.repoDir] = {
			lastModified: modified,
			contentHash: hash
		};
		gulp.src(repo.buildDir).pipe(gulp.dest(path.join('public', repo.outputDir)));
	}
	return newSiteData;
}

async function createTabElement(ejsData, info, tab, pathTemplate, contentTemplate) {
	var pathname = pathTemplate.replace(':name', info.name).replace(':tab', tab.name);
	pathname = path.join('public', pathname);
	
	var data = Object.assign({ tab: info }, ejsData);
	await mkdirs(path.dirname(pathname));
	await writeFile(pathname, contentTemplate(data));
}

async function generateTabs(ejsData) {
	var tabs = ejsData.site.tabs;
	if(!tabs) {
		return;
	}
	var tabPath = tabs.tabPath;
	var itemPath = tabs.itemPath;
	var tabTemplate = await compileTemplate(tabs.tabTemplate);
	var itemTemplate = await compileTemplate(tabs.itemTemplate);
	var promises = [];
	
	for(var tab of tabs.items) {
		await createTabElement(ejsData, tab, tab, tabPath, tabTemplate);
		if(tab.items) {
			for(var item of tab.items) {
				await createTabElement(ejsData, item, tab, itemPath, itemTemplate);
			}
		}
	}
}

async function build() {
	var ejsData = await readSite();
	var site = ejsData.site;
	
	var oldSiteData;
	if(await exists('siteData.json')) {
		oldSiteData = JSON.parse(await readFile('siteData.json'));
	} else {
		oldSiteData = {};
	}
	var newSiteData = {};
	
	await del('public/**/*');
	
	pump([
		gulp.src('src/**/*.js'),
		uglify(),
		gulp.dest('public')
	]);
	
	gulp.src(['src/**/*', '!**/*.js', '!**/*.html'])
		.pipe(gulp.dest('public'));
	
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
	
	await generateTabs(ejsData);
	
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