const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const gulp = require('gulp');
const pump = require('pump');
const uglify = require('gulp-uglify');
const gulp_ejs = require('gulp-ejs');
const ejs = require('ejs');
const serveHandler = require('serve-handler');

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
		.pipe(gulp.dest('public'))
	
	readSite(function(ejsData) {
		//pump silently swallows errors
		gulp.src('src/**/*.html')
			.pipe(gulp_ejs(ejsData))
			.pipe(gulp.dest('public'));
		
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
						var itemdata = Object.assign({tab: info}, ejsData);
						pathname = path.join('public', itemPath.replace(':name', iteminfo.name).replace(':tab', iteminfo.tab));
						mkdirs(path.dirname(pathname));
						fs.writeFileSync(pathname, tabTemplate(data));
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
			server.close();
		} else {
			return serveHandler(request, response, {
				public: 'public'
			});
		}
	});
	server.listen(8080);
});