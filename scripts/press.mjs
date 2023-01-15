import * as path from 'node:path'
import minimatch from 'minimatch'

import uglify from 'uglify-js'
import { minify as htmlMinify } from 'html-minifier-terser'
import svgo from 'svgo'
import * as babel from '@babel/core'
import CleanCSS from 'clean-css'

/**
 * compresses the file in a way that depends on its file type
 * @param pathname the path of the file to compress
 * @param contents the contents of the file to be compressed
 * @param svgoConfig the svgo configuration. If svgoConfig.disabled === true,
 *      and the pathname ends with '.svg' then the file is returned as is.
 */
export async function press (site, pathname, contents, svgoConfig) {
  for (const ignore of site.config.pressIgnore) {
    if (minimatch(pathname, ignore)) {
      return contents
    }
  }

  const ext = path.extname(pathname)
  if (ext === '.js') {
    contents = (await babel.transformAsync(contents.toString(), {
      plugins: ['@babel/plugin-transform-block-scoping']
    })).code
    const result = uglify.minify(contents)
    if (result.error) {
      console.error(`uglify: error ${pathname}`)
      throw (result.error)
    } else if (result.warnings) {
      console.log(`uglify: warnings for ${pathname}`)
      result.warnings.foreach(console.log)
    }
    contents = result.code
  } else if (ext === '.html') {
    contents = htmlMinify(contents.toString(), {
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
      removeStyleLinkTypeAttributes: true
    })
  } else if (ext === '.svg') {
    svgoConfig = svgoConfig || {}
    if (!svgoConfig.disabled) {
      contents = await svgoPromise(contents.toString(), svgoConfig)
    }
  } else if (ext === '.css') {
    contents = new CleanCSS({}).minify(contents.toString()).styles
  }
  return contents
}

/**
 * returns a promise that resolves to svgo's optimized content
 * @param contents the contents of the uncompressed svg
 * @param config the svgo configuration
 */
function svgoPromise (contents, config) {
  return new Promise((resolve, reject) => {
    new svgo(config).optimize(contents, (result) => {
      if (result.error) {
        reject(result.error)
      } else {
        resolve(result.data)
      }
    })
  })
}
