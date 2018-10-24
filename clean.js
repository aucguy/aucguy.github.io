const del = require('del');

async function clean() {
	await del('public/**/*');
	await del('build/**/*');
}

clean();