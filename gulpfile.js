const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const crypto = require('crypto');
const gulp = require('gulp');
const uglify = require('uglify-js');
const gulp_uglify = require('gulp-uglify');
const extReplace = require('gulp-ext-replace');
const gulp_ejs = require('gulp-ejs');
const ejs = require('ejs');
const markdown = require('markdown').markdown;
const through2 = require('through2');
const Vinyl = require('vinyl');
const glob = require('glob');
const del = require('del');
const htmlMinify = require('html-minifier').minify;
const svgo = require('svgo');
const babel = require('@babel/core');
const uglifycss = require('uglifycss');
const minimatch = require('minimatch');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'];

const SITE_DATA_PATH = 'build/siteData.json';
const POST_DATA_PATH = 'build/postData.json';
const POSTS_PATH = 'build/posts';

const COMPRESSED_FILES = ['.js', '.html', '.svg', '.css'];

function createRouter() {
	var rules = [];
	
	return {
		addRule: function(matcher, generator) {
			rules.push({
				matcher,
				generator,
			});
		},
		generate: function(key) {
			var rule = rules.find(rule => rule.matcher(key));
			if(rule === undefined) {
				console.warn(`rule for ${key} not found`);
				return null;
			}
			return rule.generator(key);
		} 
	};
}

function matchEquals(a) {
	return (b) => a === b;
}

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


function mkdirsSync(pathname) {
	if(!fs.existsSync(pathname)) {
		mkdirsSync(path.dirname(pathname));
		fs.mkdirSync(pathname);
	}
}

async function globFiles(globPattern, ignore) {
	return await globPromise(globPattern, {
		ignore
	});
}

function svgoPromise(contents, config) {
	return new Promise((resolve, reject) => {
		new svgo(config).optimize(contents, (result) => {
			if(result.error) {
				reject(result.error);
			} else {
				resolve(result.data);
			}
		});
	});
}

function gulpPromise(stream) {
	return new Promise((resolve, reject) => {
		stream.on('end', () => {
			resolve();
		});
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

async function writeFileMkdirs(pathname, contents) {
	await mkdirs(path.dirname(pathname));
	await writeFile(pathname, contents);
}

async function press(pathname, contents, svgoConfig) {
	var ext = path.extname(pathname);
	if(ext === '.js') {
		contents = (await babel.transformAsync(contents, {
			plugins: ['@babel/plugin-transform-block-scoping']
		})).code;
		result = uglify.minify(contents);
		if(result.error) {
			console.error(`uglify: error ${pathname}`)
			throw(result.error);
		} else if(result.warnings) {
			console.log(`uglify: warnings for ${pathname}`);
			result.warnings.foreach(console.log);
		}
		contents = result.code;
	} else if(ext === '.html') {
		contents = htmlMinify(contents, {
			collapseBooleanAttributes: true,
			collapseInlineTagWhitespace: true,
			collapseWhitespace: true,
			conservativeCollapse: true,
			decodeEntities: true,
			minifyCSS: true,
			minifyJS: true,
			removeComments: true,
			removeRedundantAttributes: true,
			removeScriptTypeAttributes: true,
			removeStyleLinkTypeAttributes: true,
		});
	} else if(ext === '.svg') {
		svgoConfig = svgoConfig || {};
		if(!svgoConfig.disabled) {
			contents = await svgoPromise(contents, svgoConfig);
		}
	} else if(ext === '.css') {
		return uglifycss.processString(contents, {});
	}
	return contents;
}

function gulpPress(svgoConfig) {
	return through2.obj(function(file, enc, callback) {
		if(file.isDirectory()) {
			this.push(file);
			callback();
		} else if(COMPRESSED_FILES.includes(path.extname(file.path))) {
			press(file.path, file.contents.toString(enc), svgoConfig)
			  		.then(contents => {
				this.push(new Vinyl({
					cwd: file.cwd,
					base: file.base,
					path: file.path,
					contents: Buffer.from(contents, enc)
				}));
				callback();
			});
		} else {
			this.push(file);
			callback();
		}
	});
}

async function writeFilePress(pathname, contents) {
	await writeFile(pathname, await press(pathname, contents));
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

async function readSite(router) {
	var data = await readFile('config.json');
	var site = JSON.parse(data.toString());
	
	var lib = {
		includePage: function(file, args, noPreprocess) {
			var data = router.generate(file);
			if(noPreprocess) {
				return data;
			} else {
				return ejs.render(data, {
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
		},
		readConfig: function(file) {
			return JSON.parse(fs.readFileSync(file).toString());
		},
		getPosts
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

async function extractPostFrontmatter(pattern, base) {
	var postData = {};
	for(var file of await globPromise(pattern)) {
		var content = await readFile(file, { encoding: 'utf-8' });
		var parts = splitFrontMatter(content.toString('utf-8'));
		var key = path.relative(base, file).replace(/[.]md$/, '');
		if(key in postData) {
			throw(new Error(`duplicate post name: ${key}`));
		}
		postData[key] = parts.frontMatter;
	}
	await writeFileMkdirs(POST_DATA_PATH, JSON.stringify(postData));
}

async function formatPost(ejsData, postTemplatePath) {
	var postTemplate = await compileTemplate(postTemplatePath);
	return through2.obj(function(file, enc, callback) {
		var parts = splitFrontMatter(file.contents.toString(enc));
		var data = Object.assign({ frontMatter: parts.frontMatter }, ejsData);
		var content = ejs.render(markdown.toHTML(parts.body), data);
		data.content = content;
		
		this.push(new Vinyl({
			cwd: file.cwd,
			base: file.base,
			path: file.path,
			contents: Buffer.from(postTemplate(data), enc)
		}));
		callback();
	});
}

function getPosts() {
	var postData = JSON.parse(fs.readFileSync(POST_DATA_PATH));
	var files = glob.sync(path.join(POSTS_PATH, '**/*.html')).map(i => {
		return {
			path: i,
			date: postData[path.basename(i, '.html')].date,
			title: postData[path.basename(i, '.html')].title
		};
	});
	files.sort(function(a, b) {
		var partsA = a.date.split('-').map(Number);
		var partsB = b.date.split('-').map(Number);
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

async function createPaginateType(config, standalone) {
	return {
		template: await compileTemplate(config.template),
		path: config.output,
		standalone
	};
}

function nextPage(template, i, totalPages) {
	if(i === totalPages - 1) {
		return null;
	} else {
		return template.path.replace('${i}', i + 1);
	}
}

async function writePaginate(template, data, i) {
	var contents = template.template(data);
	var pathname = path.join('public', template.path.replace('${i}', i));
	await writeFilePress(pathname, contents);
}

async function generatePaginates(ejsData) {
	var config = ejsData.site.paginate;
	if(!config) {
		throw(new Error('paginate config not found'));
	}
	var files = await getPosts();
	await mkdirs('public/paginates');
	
	var embeddedTemplate = await createPaginateType(config.embedded, false);
	var standaloneTemplate = await createPaginateType(config.standalone, true);
	
	var totalPages = Math.ceil(files.length / config.postsPerPage);
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
	await writeFile('build/paginate.json', JSON.stringify({
		totalPages
	}));
}

async function createRepo(data, oldSiteData) {
	var obj = {
		repoDir: data.dir,
		repoDirGlob: path.join(data.dir, '**/*'),
		buildDir: path.join(data.dir, data.build, '**/*'),
		outputDir: path.join('public', data.output),
		cacheDir: path.join('build/repoCache', data.dir),
		cacheDirGlob: path.join('build/repoCache', data.dir, '**/*'),
		cmd: data.cmd,
		svgoConfig: data.svgo,
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
	var promises = [];
	for(var repoData of outputBuild) {
		var repo = await createRepo(repoData, oldSiteData);
		var modified = await lastModified(repo.files);
		var hash = contentHash(repo.files);
		
		if(needsRebuild(repo, modified, hash)) {
			console.log('building ' + repo.repoDir);
			await exec(repo.cmd, {
				cwd: repo.repoDir
			});
			await gulp.src(repo.buildDir)
					.pipe(gulpPress(repo.svgoConfig))
					.pipe(gulp.dest(repo.cacheDir));
			var files = await globFiles(repo.repoDirGlob, repo.excludes);
			modified = await lastModified(files);
			hash = contentHash(files);
		}
		newSiteData[repo.repoDir] = {
			lastModified: modified,
			contentHash: hash
		};
		promises.push(gulpPromise(gulp.src(repo.cacheDirGlob)
			.pipe(gulp.dest(repo.outputDir))));
	}
	await Promise.all(promises);
	return newSiteData;
}

async function formatStandalonePost(ejsData, templatePath) {
	var template = await compileTemplate(templatePath);
	var postData = JSON.parse(await readFile(POST_DATA_PATH));
	return through2.obj(function(file, enc, callback) {
		var key = path.relative(file.base, file.path).replace(/[.]html$/, '');
		var data = Object.assign({
			post: {
				contents: file.contents.toString(enc),
				title: postData[key].title
			}
		}, ejsData);
		this.push(new Vinyl({
			cwd: file.cwd,
			base: file.base,
			path: file.path,
			contents: Buffer.from(template(data), enc)
		}));
		callback();
	});
}

async function build() {
	debugger;
	var router = createRouter();
	var ejsData = await readSite(router);
	var site = ejsData.site;
		
	var oldSiteData;
	if(await exists(SITE_DATA_PATH)) {
		oldSiteData = JSON.parse(await readFile(SITE_DATA_PATH));
	} else {
		oldSiteData = {};
	}
	var newSiteData = {};
	
	
	await del('public/**/*');
	
	router.addRule(matchEquals('$main'), () => {
		for(var file of glob.sync('src/**/*', { nodir: true })) {
			router.generate(file.replace(/^src/, 'public'));
		}
	});
	
	router.addRule(key => minimatch(key, 'includes/**/*'), key => fs.readFileSync(key).toString())
	
	router.addRule(key => {
		var file = key.replace(/^public/, 'src');
		return minimatch(key, 'public/**/*') && fs.existsSync(file)
			&& fs.statSync(file).isFile();
	}, key => {
		if(fs.existsSync(key)) {
			return fs.readFileSync(key);
		}
		var file = key.replace(/^public/, 'src');
		var contents = fs.readFileSync(file);
		if(path.extname(key) === '.html' 
			|| path.normalize(key) === path.normalize('public/script.js')
			|| path.normalize(key) === path.normalize('public/style.css')) {
			contents = ejs.render(contents.toString(), ejsData);
		}
		mkdirsSync(path.dirname(key));
		fs.writeFileSync(key, contents);
		return contents;
	});
	
	router.addRule(key => minimatch(key, 'public/paginates/paginate*.html'), key => '');
	
	router.generate('$main');
	
	//gulp.src(['src/**/*', '!src/**/*.html', '!src/script.js', '!src/style.css'])
	//	.pipe(gulpPress())
	//	.pipe(gulp.dest('public'))
		
	//gulp.src(['src/script.js', 'src/style.css'])
	//	.pipe(gulp_ejs(ejsData))
	//	.pipe(gulpPress())
	//	.pipe(gulp.dest('public'));
	
	//await extractPostFrontmatter('posts/**/*.md', 'posts');
	//await gulpPromise(gulp.src('posts/**/*.md')
	//	.pipe(await formatPost(ejsData, 'post.html'))
	//	.pipe(extReplace('.html'))
	//	.pipe(gulp.dest(POSTS_PATH)));
	
	//await gulpPromise(gulp.src(path.join(POSTS_PATH, '**/*.html'))
	//	.pipe(await formatStandalonePost(ejsData, 'standalonePost.html'))
	//	.pipe(extReplace('.html'))
	//	.pipe(gulpPress())
	//	.pipe(gulp.dest('public/posts')));
	
	//await generatePaginates(ejsData);
	//gulp.src('src/**/*.html')
	//	.pipe(gulp_ejs(ejsData))
	//	.pipe(gulpPress())
	//	.pipe(gulp.dest('public'));
		
	//if(site.outputBuild) {
	//	newSiteData.outputBuild = await outputBuild(site.outputBuild, oldSiteData.outputBuild || {});
	//}
	await writeFileMkdirs(SITE_DATA_PATH, JSON.stringify(newSiteData));
	console.log('finished build');
}

gulp.task('build', () => {
	build().catch((err) => {
		throw(err);
		process.exit(1); //not the best solution
	});
});