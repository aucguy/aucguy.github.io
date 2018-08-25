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

gulp.task('build', function() {
	pump([
		gulp.src('src/**/*.js'),
		uglify(),
		gulp.dest('public')
	]);
	
	readSite(function(ejsData) {
		//pump silently swallows errors
		gulp.src('src/**/*.html')
			.pipe(gulp_ejs(ejsData))
			.pipe(gulp.dest('public'));
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