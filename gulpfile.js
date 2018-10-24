const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const crypto = require('crypto');
const uglify = require('uglify-js');
const ejs = require('ejs');
const markdown = require('markdown').markdown;
const glob = require('glob');
const del = require('del');
const htmlMinify = require('html-minifier').minify;
const svgo = require('svgo');
const babel = require('@babel/core');
const uglifycss = require('uglifycss');
const minimatch = require('minimatch');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'];
const OUTPUT_BUILD_DATA = 'build/outputBuild.json';

async function maybeResolve(x) {
	return x instanceof Promise ? await x : x;
}

function createRouter() {
	var rules = [];
	var cache = new Map();
	
	var self = {
		addRule: function(rule) {
			rules.push(rule);
		},
		generate: async function(key) {
			if(cache.has(key)) {
				return cache.get(key);
			}
			if(fs.existsSync(key)) {
				return fs.readFileSync(key).toString();
			}
			for(var rule of rules) {
				var value = await rule(self, key);
				if(value !== null) {
					return value;
				}
			}
			console.warn(`rule for ${key} not found`);
			return null;
		},
		getMemoryCache: function() {
			return cache;
		}
	};
	return self;
}

async function doRule(router, key, matcher, generator, cacher) {
	if(await maybeResolve(matcher(key))) {
		var value = await maybeResolve(generator(key));
		await maybeResolve(cacher(router, key, value));
		return value === null ? {} : value;
	} else {
		return null;
	}
}

function createRule(matcher, generator, cacher) {
	cacher = cacher || cacherNone;
	return async (router, key) => await doRule(router, key, matcher, generator, cacher);
}

function toFromRule(fromDir, fromExt, toDir, toExt, generator, cacher) {
	var pattern = path.join(toDir, '**/*');
	var re;
	if(toExt && fromExt) {
		re = new RegExp('[.]' + toExt + '$');
		pattern += '.' + toExt;
	} else {
		re = null;
	}
	return async (router, key) => {
		var file = path.join(fromDir, path.relative(toDir, key));
		if(toExt && fromExt) {
			file = file.replace(re, '.' + fromExt);
		}
		return await doRule(router, key, 
			async () => minimatch(key, pattern) && await exists(file)
				&& (await lstat(file)).isFile(),
			() => generator(key, file) || {}, cacher);
	};
}

function paginateRule(pathformat, site, isEmbedded, cacher) {
	var re = new minimatch.Minimatch(pathformat.replace('{i}', '<i>')).makeRe();
	re = re.source.replace('<i>', '([0-9]+)');
	return async (router, key) => {
		var matches = new RegExp(re).exec(key);
		return await doRule(router, key,
			() => matches !== null,
			async () => await generatePaginate(key, site, 
				isEmbedded, parseInt(matches[1])), cacher);
	};
}

function symbolRule(symbol, generator, cacher) {
	return createRule(key => key === symbol, generator, cacher);
};

function cacherNone(router, key, value) {
}

function cacherMemory(router, key, value) {
	router.getMemoryCache().set(key, value);
}

function cacherFile(router, key, value) {
	mkdirsSync(path.dirname(key));
	fs.writeFileSync(key, value);
}

async function cacherPress(router, key, value) {
	mkdirsSync(path.dirname(key));
	fs.writeFileSync(key, await press(key, value.toString()));
}

function isInt(x) {
	try {
		parseInt(x);
		return true;
	} catch(e) {
		return false;
	}
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
		contents = babel.transformSync(contents, {
			plugins: ['@babel/plugin-transform-block-scoping']
		}).code;
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

async function createSite() {
	var config = JSON.parse(await readFile('config.json'));
	var router = createRouter();
	
	var lib = {
		includePage: async function(file, args, noPreprocess) {
			var data = (await router.generate(file)).toString();
			if(noPreprocess) {
				return data;
			} else {
				return await ejs.render(data, {
					lib,
					args,
					config
				}, {
					async: true
				});
			}
		},
		include: async function(file, args) {
			return await lib.includePage(path.join('includes', file), args);
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
		generate: async function(key) {
			return await router.generate(key);
		},
		maybeResolve,
		args: null
	};
	
	return {
		ejsData: {
			lib,
			args: null,
			config
		},
		config,
		router
	};
}

function compileTemplate(pathname) {
	var data = fs.readFileSync(path.join('includes', pathname));
	return ejs.compile(data.toString(), { async: true });
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

function extractPostFrontmatter(site) {
	var posts = [];
	for(var file of glob.sync('posts/**/*.md')) {
		var content = fs.readFileSync(file, { encoding: 'utf-8' });
		var parts = splitFrontMatter(content.toString('utf-8'));
		var key = path.relative('posts', file).replace(/[.]md$/, '');
		if(key in posts) {
			throw(new Error(`duplicate post name: ${key}`));
		}
		posts.push(Object.assign({ path: path.join('build/posts', key + '.html') }, parts.frontMatter));
	}
	posts.sort(function(a, b) {
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
	posts.reverse(); //so its newest to oldest
	return {
		posts,
		totalPaginates: Math.ceil(posts.length / site.config.paginate.postsPerPage)
	};
}

function formatPost(key, file, site, postTemplatePath) {
	var content = fs.readFileSync(file);
	var parts = splitFrontMatter(content.toString());
	var data = Object.assign({
		content: markdown.toHTML(parts.body),
		frontMatter: parts.frontMatter
	}, site.ejsData);
	var template = compileTemplate(postTemplatePath);
	return template(data);
}

function createPaginateType(config, standalone) {
	return {
		template: compileTemplate(config.template),
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

async function generatePaginate(key, site, isEmbedded, i) {
	var config = site.config.paginate;
	if(!config) {
		throw(new Error('paginate config not found'));
	}
	var postData = await site.router.generate('$postData');
	var totalPages = postData.totalPaginates;
		
	var embeddedTemplate = createPaginateType(config.embedded, false);
	var standaloneTemplate = createPaginateType(config.standalone, true);
	
	var template;
	if(isEmbedded) {
		template = embeddedTemplate
	} else {
		template = standaloneTemplate;
	}
	
	var data = Object.assign({
		paginator: {
			nextPage: nextPage(embeddedTemplate, i, totalPages),
			nextStandalonePage: nextPage(standaloneTemplate, i, totalPages),
			posts: postData.posts.slice(i * totalPages, (i + 1) * totalPages),
			page: i,
			totalPages
		}
	}, site.ejsData);
	
	return await template.template(data);
}

async function createRepo(data, oldSiteData) {
	var obj = {
		repoDir: data.dir,
		repoDirGlob: path.join(data.dir, '**/*'),
		buildDir: path.join(data.dir, data.build),
		buildDirGlob: path.join(data.dir, data.build, '**/*'),
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
	obj.excludes = [obj.buildDirGlob, path.join(data.dir, data.exclude)];
	obj.files = await globFiles(obj.repoDirGlob, obj.excludes);
	return obj;
}

function needsRebuild(repo, modified, hash) {
	return modified > repo.lastModified || hash !== repo.contentHash;
}

async function outputBuild(site, oldData) {
	var config = site.config.outputBuild;
	if(!config) {
		return;
	}
	var newData = {};
	var promises = [];
	for(var repoData of config) {
		let repo = await createRepo(repoData, oldData);
		var modified = await lastModified(repo.files);
		var hash = contentHash(repo.files);
		
		if(needsRebuild(repo, modified, hash)) {
			console.log('building ' + repo.repoDir);
			await exec(repo.cmd, {
				cwd: repo.repoDir
			});
			for(var file of await globPromise(repo.buildDirGlob, { nodir: true })) {
				var outFile = path.join(repo.cacheDir, path.relative(repo.buildDir, file));
				await writeFileMkdirs(outFile, await readFile(file));
			}
			var files = await globFiles(repo.repoDirGlob, repo.excludes);
			modified = await lastModified(files);
			hash = contentHash(files);
		}
		newData[repo.repoDir] = {
			lastModified: modified,
			contentHash: hash
		};
		promises.push((async function() {
			for(var file of await globPromise(repo.cacheDirGlob, { nodir: true })) {
				var outFile = path.join(repo.outputDir, path.relative(repo.cacheDir, file));
				await writeFileMkdirs(outFile, await readFile(file));
			}
		})());
	}
	await Promise.all(promises);
	return newData;
}

async function formatStandalonePost(key, site, templatePath) {
	var template = compileTemplate(templatePath);
	var postData = await site.router.generate('$postData');
	var file = path.join('build/posts', path.relative('public/posts', key));
	var data = Object.assign({
		post: {
			contents: await site.router.generate(file),
			title: postData.posts.find(post => path.normalize(file) === path.normalize(post.path)).title
		}
	}, site.ejsData);
	return template(data);
}

async function build() {
	var site = await createSite();
	
	await del('public/**/*');
	
	site.router.addRule(symbolRule('$main', async () => {
		for(var file of glob.sync('src/**/*', { nodir: true })) {
			await site.router.generate(file.replace(/^src/, 'public'));
		}
		var postData = await site.router.generate('$postData');
		for(var post of postData.posts) {
			await site.router.generate(post.path.replace(/^build/, 'public'));
		}
		for(var i=0; i<postData.totalPaginates; i++) {
			await site.router.generate(`public/paginates/paginate${i}.html`);
			await site.router.generate(`public/paginates/standalonePaginate${i}.html`);
		}
	}));
	
	site.router.addRule(createRule(key => minimatch(key, 'includes/**/*'), key => fs.readFileSync(key).toString()));
	
	site.router.addRule(toFromRule('src', null, 'public', null, async (key, file) => {
		var contents = fs.readFileSync(file);
		if(path.extname(key) === '.html' 
			|| path.normalize(key) === path.normalize('public/script.js')
			|| path.normalize(key) === path.normalize('public/style.css')) {
			contents = await ejs.render(contents.toString(), site.ejsData, { async: true });
		}
		return contents;
	}, cacherPress));
	
	site.router.addRule(toFromRule('posts', 'md', 'build/posts', 'html',
		(key, file) => formatPost(key, file, site, 'post.html'), cacherFile));
	
	site.router.addRule(toFromRule('posts', 'md', 'public/posts', 'html',
		(key, file) => formatStandalonePost(key, site, 'standalonePost.html'), cacherPress));
	
	site.router.addRule(paginateRule('public/paginates/paginate{i}.html', site, true, cacherPress));
	site.router.addRule(paginateRule('public/paginates/standalonePaginate{i}.html', site, false, cacherPress));
	site.router.addRule(symbolRule('$postData', key => extractPostFrontmatter(site), cacherMemory));
	
	await site.router.generate('$main');
	
	var oldOutputBuild;
	if(await exists(OUTPUT_BUILD_DATA)) {
		oldOutputBuild = JSON.parse(await readFile(OUTPUT_BUILD_DATA));
	} else {
		oldOutputBuild = {};
	}
	
	await writeFileMkdirs(OUTPUT_BUILD_DATA, JSON.stringify(await outputBuild(site, oldOutputBuild)));
	
	console.log('finished build');
}

build();