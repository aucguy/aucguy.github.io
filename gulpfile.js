const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const gulp = require('gulp');
const pump = require('pump');
const uglify = require('gulp-uglify');
const extReplace = require('gulp-ext-replace');
const gulp_ejs = require('gulp-ejs');
const ejs = require('ejs');
const markdown = require('markdown').markdown;
const serveHandler = require('serve-handler');
const through2 = require('through2');
const Vinyl = require('vinyl');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'];

function readSite(callback) {
	fs.readFile('config.json', function(err, data) {
		if(err) {
			throw(err);
		}
		var site = JSON.parse(data.toString());
		
		var lib = {
			include: function(file, args) {
				var data = fs.readFileSync(path.join('includes', file));
				return ejs.render(data.toString(), {
					lib,
					args,
					site
				});
			},
			date: function(date) {
				var parts = date.split('-');
				return MONTHS[parseInt(parts[1]) - 1] + ' ' + parts[2] + ', ' + parts[0];
			}
		}
		
		callback({
			lib,
			site,
			args: null
		});
	});
}

function compileTemplate(pathname) {
	var data = fs.readFileSync(path.join('includes', pathname));
	return ejs.compile(data.toString());
}

function formatPost(ejsData, postTemplatePath) {
	var postTemplate = compileTemplate(postTemplatePath);
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

function mkdirs(pathname) {
	if(!fs.existsSync(pathname)) {
		mkdirs(path.dirname(pathname));
		fs.mkdirSync(pathname);
	}
}

gulp.task('build', function() {
	pump([
		gulp.src('src/**/*.js'),
		uglify(),
		gulp.dest('public')
	]);
	
	gulp.src(['src/**/*', '!**/*.js', '!**/*.html'])
		.pipe(gulp.dest('public'));
	
	readSite(function(ejsData) {
		//pump silently swallows errors
		gulp.src('src/**/*.html')
			.pipe(gulp_ejs(ejsData))
			.pipe(gulp.dest('public'));
		
		gulp.src('posts/**/*.md')
			.pipe(formatPost(ejsData, 'post.html'))
			.pipe(extReplace('.html'))
			.pipe(gulp.dest('public/posts'));
		
		//generate tabs
		var site = ejsData.site;
		if(site.tabs) {
			var tabPath = site.tabs.tab_path;
			var tabTemplate = compileTemplate(site.tabs.tab_template);
			var itemPath = site.tabs.item_path;
			var itemTemplate = compileTemplate(site.tabs.item_template);
			
			for(var name in site.tabs.items) {
				var info = Object.assign({name}, site.tabs.items[name]);
				var data = Object.assign({tab: info}, ejsData);
				var pathname = path.join('public', tabPath.replace(':name', info.name));
				mkdirs(path.dirname(pathname));
				fs.writeFileSync(pathname, tabTemplate(data));
				
				if(site.tabs.items[name].items) {
					for(var itemname in site.tabs.items[name].items) {
						var iteminfo = Object.assign({name: itemname, tab: name}, site.tabs.items[name].items[itemname]);
						var itemdata = Object.assign({tab: iteminfo}, ejsData);
						pathname = path.join('public', itemPath.replace(':name', iteminfo.name).replace(':tab', iteminfo.tab));
						mkdirs(path.dirname(pathname));
						fs.writeFileSync(pathname, itemTemplate(itemdata));
					}
				}
			}
		}
	});
});

gulp.task('serve', ['build'], function() {
	var server = http.createServer(function(request, response) {
		var name = url.parse(request.url).pathname;
		if(name === '/close') {
			response.statusCode = 200;
			response.setHeader('content-type', 'text/plain');
			response.end('server shut down');
			server.close();
		} else {
			return serveHandler(request, response, {
				public: 'public'
			});
		}
	});
	server.listen(8080);
});