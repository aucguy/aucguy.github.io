const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
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
//where to output the persistent output build data
const OUTPUT_BUILD_DATA = 'build/outputBuild.json';

async function maybeResolve(x) {
	return x instanceof Promise ? await x : x;
}

const INT_REGEX = /[0-9]+/;

function isInt(x) {
	return INT_REGEX.test(x);
}

/**
 * the router figures out how to generate each file.
 * Each rule returns the contents of the file it generates, or null if it does
 * not generate the file.
 */
function createRouter() {
	//the array of rules associated with this router
	var rules = [];
	//the in memory cache
	var cache = new Map();
	
	var self = {
		addRule: function(rule) {
			rules.push(rule);
		},
		/**
		 * generates the given file (or key)
		 * If the file exists in the in memory cache or the file
		 * system, this function returns the cached file.
		 * If the file is not cached, the rules are invoked until one generates
		 * the file.
		 */
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

/**
 * Executes the given rule
 * @param router the router object
 * @param key the filename (or symbol)
 * @param match an optionally async function that takes the argument of key
 * 		and returns whether or not this rule generates the given file.
 * 		If so, generator and cacher are invoked.
 * @param generator an optionally async function that takes the argument of key
 * 		and returns the contents of the file.
 * @param cacher an optionally async function that takes the arguments of router,
 * 		key and value and caches the file where ever it should be cached.
 */
async function doRule(router, key, matcher, generator, cacher) {
	if(await maybeResolve(matcher(key))) {
		var value = await maybeResolve(generator(key));
		await maybeResolve(cacher(router, key, value));
		return value === null ? {} : value;
	} else {
		return null;
	}
}

/**
 * creates a rule. See above for the arguments.
 * @cacher optional, defaults to cacherNone
 */
function createRule(matcher, generator, cacher) {
	cacher = cacher || cacherNone;
	return async (router, key) => await doRule(router, key, matcher, generator, cacher);
}

/**
 * creates a rule that takes files from a directory and generates them into a
 * directory
 * 
 * @param fromDir the directory to take files from
 * @param fromExt the file extension of files to be taken
 * 		If this null or toExt is null, the file extensions are ignored
 * @param toDir the directory to generate files into
 * @param the file extension of the generated files
 * 		If this or fromExt is null, the file extensions are ignored
 * @param generator, see doRule for details
 * @param cacher, see doRule for details
 */
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

/**
 * creates a rule that generates paginate files
 * 
 * @param site the site object
 * @param isEmbedded true if the paginate is embedded, false if standalone
 * @param cacher, see doRule for details
 */
function paginateRule(site, isEmbedded, cacher) {
	var config;
	if(isEmbedded) {
		config = site.config.paginate.embedded;
	} else {
		config = site.config.paginate.standalone;
	}
	pathformat = path.join('public', config.output);
	
	//'${i}' is replaced with '<i>' since '{' and '}' are special characters
	//in regular expressions
	var re = new minimatch.Minimatch(pathformat.replace('${i}', '<i>')).makeRe();
	re = re.source.replace('<i>', '([0-9]+)').replace(new RegExp('\/', 'g'), path.sep);
	return async (router, key) => {
		//the RegExp is created each time because RegExp.exec affects the state
		//of the RegExp object
		var matches = new RegExp(re).exec(path.normalize(key));
		return await doRule(router, key,
			() => matches !== null,
			async () => await generatePaginate(key, site, 
				isEmbedded, parseInt(matches[1])), cacher);
	};
}

/**
 * creates a rule that matches if the key is equals the symbol
 * 
 * @param symbol if the key equals the symbol the rule matches
 * @param generator, see doRule
 * @param cacher, see doRule
 */
function symbolRule(symbol, generator, cacher) {
	return createRule(key => key === symbol, generator, cacher);
};

/**
 * a cacher which does nothing. This will cause the rule to regenerate every
 * time it is invoked
 * 
 * @param router the router object
 * @param key the file key
 * @param value the contents of the file
 */
function cacherNone(router, key, value) {
}

/**
 * caches the file in memory via the router's map
 */
function cacherMemory(router, key, value) {
	router.getMemoryCache().set(key, value);
}

/**
 * caches the file by saving it to the file system.
 * This only works if the key is a valid path. (ie is not a symbol)
 */
function cacherFile(router, key, value) {
	mkdirsSync(path.dirname(key));
	fs.writeFileSync(key, value);
}

/**
 * caches the file by saving it to the file system while also
 * compressing the file.
 */
async function cacherPress(router, key, value) {
	mkdirsSync(path.dirname(key));
	fs.writeFileSync(key, await press(key, value));
}

/**
 * Takes a function whose last argument is a callback and turns it into an
 * a function that returns a promise. When the returned function is invoked,
 * promisify passes the arguments of the returned function to func along with a
 * callback appended as the last argument. If the first argument of the
 * callback is truthy, then the promise rejects with the first argument.
 * Otherwise it resolves with the second argument of the callback.
 */
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

//creates a bunch of the promise version of multiple functions
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const lstat = promisify(fs.lstat);
const globPromise = promisify(glob);
const exec = promisify(child_process.exec);

function readFileSync(pathname) {
	return fs.readFileSync(pathname, { encoding: 'utf-8' });
}

//the async version of fs.existsSync
//it does not use promisify because it resolves even if the error is true
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

/**
 * makes the directories and any parent directories as necessary
 */
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

/**
 * writes to a file while making any necessary parent directories
 */
async function writeFileMkdirs(pathname, contents) {
	await mkdirs(path.dirname(pathname));
	await writeFile(pathname, contents);
}

/**
 * returns a promise that resolves to svgo's optimized content
 * @param contents the contents of the uncompressed svg
 * @param config the svgo configuration
 */
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

/**
 * compresses the file in a way that depends on its file type
 * @param pathname the path of the file to compress
 * @param contents the contents of the file to be compressed
 * @param svgoConfig the svgo configuration. If svgoConfig.disabled === true,
 * 		and the pathname ends with '.svg' then the file is returned as is.
 */
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

/**
 * converts a date in a string format to a time object.
 * The string is in the format 'YEAR-MONTH-DAY' or 'YEAR-MONTH-DAY-HOUR-MINUTE'
 * where 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE' are all integers.
 * The time objects has the properties of 'year', 'month', 'day', 'hour' and 'minute'
 */
function strToTime(str) {
	var parts = str.split('-');
	if(parts.length !== 3 && parts.length !== 5 || !parts.every(isInt)) {
		throw(new Error('invalid date'));
	}
	return {
		year: parseInt(parts[0]),
		month: parseInt(parts[1]),
		day: parseInt(parts[2]),
		hour: parseInt(parts[3]),
		minute: parseInt(parts[4])
	};
}

/**
 * converts a time object into a pretty string.
 */
function timeToStr(time) {
	var str = `${MONTHS[time.month - 1]} ${time.day}, ${time.year}`;
	if(time.hour && time.minute) {
		var pm = time.hour > 12;
		var hour = pm ? time.hour - 12 : time.hour;
		str = `${str} ${hour}:${time.minute} ${pm ? 'PM' : 'AM'}`;
	}
	return str;
}

/**
 * creates a site object. This is the object which holds references to many
 * central objects. The config property is the parsed contents of the
 * config.json file. The router property is a reference to the router. The
 * ejsData property is the data argument for ejs functions.
 */
async function createSite() {
	var config = JSON.parse(await readFile('config.json'));
	var router = createRouter();
	
	var lib = {
		/**
		 * returns an ejs rendered page.
		 * @param file the path to the file to include
		 * @param args the args variable will be set to this argument
		 * @param noPreprocess optional. if true, the file will be returned as
		 * 		it appears in the file system, and will not be rendered via ejs
		 */
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
		/**
		 * same as include page, but the file is in the 'includes' folder
		 */
		include: async function(file, args) {
			return await lib.includePage(path.join('includes', file), args);
		},
		/**
		 * formats the given date
		 * @param date the date in the frontmatter 'YEAR-MONTH-DAY' format
		 * @return a date in the pretty 'Month day, year' format
		 */
		date: function(date) {
			return timeToStr(strToTime(date));
		},
		/**
		 * takes a markdown string and converts it into HTML
		 */
		markdown: function(content) {
			return markdown.toHTML(content);
		},
		/**
		 * returns what the router generates for the given key
		 */
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

/**
 * reads the template in the includes folder and turns it into an ejs template
 */
function compileTemplate(pathname) {
	var data = fs.readFileSync(path.join('includes', pathname));
	return ejs.compile(data.toString(), { async: true });
}

/**
 * splits a string's frontmatter from its content
 * @return the frontmatter property is an object whose keys and values
 * 		correspond to str's frontmatter and body corresponds to the string's body
 */
function splitFrontMatter(str) {
	var beginIndex = str.indexOf('---');
	var endIndex = str.indexOf('---', beginIndex + 1);
	if(!str.trim().startsWith('---') || endIndex === -1) {
		//frontmatter does not exist
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

/**
 * extracts the each post's frontmatter
 */
function extractPostData(site) {
	var posts = [];
	for(var file of glob.sync('posts/**/*.md')) {
		var content = fs.readFileSync(file);
		var parts = splitFrontMatter(content.toString());
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

/**
 * formats a post into an intermediate format that is used by other pages
 * @param key the filename of the post to output
 * @param file the path to the post's .md file
 * @param site the site object
 * @param postTemplatePath the path to the post template
 */
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

/**
 * formats a standalone post page
 * @param key the file name of the post to output
 * @param site the site object
 * @param templatePath the path to the standalone post template
 */
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

/**
 * creates a paginate object
 * @param the paginate's config
 */
function createPaginateType(config) {
	return {
		template: compileTemplate(config.template),
		path: config.output,
	};
}

/**
 * returns the path to the paginate's next page
 * @param template the paginate object
 * @param i the current page
 * @parma totalPages the total amount of paginate pages
 */
function nextPage(template, i, totalPages) {
	if(i === totalPages - 1) {
		return null;
	} else {
		return template.path.replace('${i}', i + 1);
	}
}

/**
 * returns the path to the paginate's previous page
 * @param template the paginate object
 * @param i the current page
 */
function previousPage(template, i) {
	if(i === 0) {
		return null;
	} else {
		return template.path.replace('${i}', i - 1);
	}
}

/**
 * generates a paginate page
 * @param key the file name of the paginate to generate
 * @param site the site object
 * @param isEmbedded true if the paginate is embedded (ie feeds), false if
 * 		standalone
 * @param i the paginate's number
 */
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
	
	//the paginate template gets a special object
	var data = Object.assign({
		paginator: {
			nextPage: nextPage(embeddedTemplate, i, totalPages),
			nextStandalonePage: nextPage(standaloneTemplate, i, totalPages),
			previousStandalonePage: previousPage(standaloneTemplate, i),
			posts: postData.posts.slice(i * totalPages, (i + 1) * totalPages),
			page: i,
			totalPages
		}
	}, site.ejsData);
	
	return await template.template(data);
}

/**
 * creates a repo object
 * @param data the configuration associated with this repo, which is found in
 * 		config.json
 * @param the build data associated with this repo, which is found in
 * 		OUTPUT_BUILD_DATA
 */
async function createRepo(data, oldData) {
	var obj = {
		//the directory all the contents of repository are found in
		repoDir: data.dir,
		repoDirGlob: path.join(data.dir, '**/*'),
		//the directory the repo builds into
		buildDir: path.join(data.dir, data.build),
		buildDirGlob: path.join(data.dir, data.build, '**/*'),
		//the directory which the repo's built files are ultimately placed on
		//the website
		outputDir: path.join('public', data.output),
		//the directory to cache the repo's built files
		cacheDir: path.join('build/repoCache', data.dir),
		cacheDirGlob: path.join('build/repoCache', data.dir, '**/*'),
		//the repo's build command
		cmd: data.cmd,
		//the repo's svgo config
		svgoConfig: data.svgo,
		//the git HEAD commit hash
		lastHead: oldData[data.dir] ? oldData[data.dir].head : '~',
		excludes: null,
		files: null
	};
	return obj;
}

/**
 * Copies the repositories built files into the public folder.
 * Builds the repos as needed. The build data contains the git HEAD commit
 * hashes of the repos.
 * @param site the site object
 * @param oldData the build data from the previous run
 * @returns the build data from this run
 */
async function outputBuild(site, oldData) {
	var config = site.config.outputBuild;
	if(!config) {
		return;
	}
	var newData = {};
	var allFiles = [];
	//handle each repo concurrently
	await Promise.all(config.map(async repoData => {
		var repo = await createRepo(repoData, oldData);
		var head = await exec('git rev-parse HEAD', {
			cwd: repo.repoDir
		});
		head = head.slice(0, head.length - 1);
		
		//if the HEAD commit changed, then we make the assumption the contents
		//changed, so then rebuild
		if(repo.lastHead !== head) {
			console.log('building ' + repo.repoDir);
			await exec(repo.cmd, {
				cwd: repo.repoDir
			});
			//update the cache
			for(var file of await globPromise(repo.buildDirGlob, { nodir: true })) {
				var outFile = path.join(repo.cacheDir, path.relative(repo.buildDir, file));
				await writeFileMkdirs(outFile, await readFile(file));
			}
		}
		newData[repo.repoDir] = {
			head
		};
		//copy the files from the cache to the output
		for(var file of await globPromise(repo.cacheDirGlob, { nodir: true })) {
			var outFile = path.join(repo.outputDir, path.relative(repo.cacheDir, file));
			await writeFileMkdirs(outFile, await readFile(file));
		}
	}));
	await writeFile('files.txt', allFiles.join('\n'));
	return newData;
}

/**
 * the main task that builds the entire website
 */
async function build() {
	var start = Date.now();
	var site = await createSite();
	
	//clean the website prior to generating anything
	await del('public/**/*');
	
	//tells the website to generate any public facing pages
	//(excluding those from repos)
	site.router.addRule(symbolRule('$main', async () => {
		var file;
		//everything that is just in the src folder
		for(file of glob.sync('src/**/*', { nodir: true })) {
			file = path.join('public', path.relative('src', file));
			await site.router.generate(file);
		}
		var postData = await site.router.generate('$postData');
		//all of the standalone post pages
		for(var post of postData.posts) {
			file = path.join('public/posts', path.relative('build/posts', post.path));
			await site.router.generate(file);
		}
		//all of the paginates, both embedded and standalone
		for(var i=0; i<postData.totalPaginates; i++) {
			file = path.join('public', site.config.paginate.embedded.output.replace('${i}', i));
			await site.router.generate(file);
			file = path.join('public', site.config.paginate.standalone.output.replace('${i}', i));
			await site.router.generate(file);
		}
	}));
	
	//gets files in the includes folder
	site.router.addRule(createRule(key => minimatch(key, 'includes/**/*'), key => fs.readFileSync(key).toString()));
	
	//generates files that are present directly in the src folder
	site.router.addRule(toFromRule('src', null, 'public', null, async (key, file) => {
		var contents = fs.readFileSync(file);
		//ejs render certain files
		if(path.extname(key) === '.html' 
			|| path.normalize(key) === path.normalize('public/script.js')
			|| path.normalize(key) === path.normalize('public/style.css')) {
			contents = await ejs.render(contents.toString(), site.ejsData, { async: true });
		}
		return contents;
	}, cacherPress));
	
	//generates intermediate rendered posts
	site.router.addRule(toFromRule('posts', 'md', 'build/posts', 'html',
		(key, file) => formatPost(key, file, site, 'post.html'), cacherFile));
	
	//generates standalone post pages
	site.router.addRule(toFromRule('posts', 'md', 'public/posts', 'html',
		(key, file) => formatStandalonePost(key, site, 'standalonePost.html'), cacherPress));
	
	//generates paginates
	site.router.addRule(paginateRule(site, true, cacherPress));
	site.router.addRule(paginateRule(site, false, cacherPress));
	//generates the extracted frontmatter from posts
	site.router.addRule(symbolRule('$postData', key => extractPostData(site), cacherMemory));
	
	//causes the router to generate the '$main' file, which in turn generates the entire site
	await site.router.generate('$main');
	
	//outputs the files from repos
	var oldOutputBuild;
	if(await exists(OUTPUT_BUILD_DATA)) {
		oldOutputBuild = JSON.parse(await readFile(OUTPUT_BUILD_DATA));
	} else {
		oldOutputBuild = {};
	}
	
	//writes the new OUTPUT_BUILD_DATA
	await writeFileMkdirs(OUTPUT_BUILD_DATA, JSON.stringify(await outputBuild(site, oldOutputBuild)));
	
	console.log(`finished build in ${(Date.now() - start) / 1000} s`);
}

build();