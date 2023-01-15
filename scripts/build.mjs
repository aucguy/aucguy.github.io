import { rm, access, readFile, writeFile, mkdir } from 'node:fs/promises'
import { promisify } from 'node:util'
import * as path from 'node:path'
import minimatch from 'minimatch'
import * as ejs from 'ejs'
import glob from 'glob'

import { paginate, extractPostData, intermediatePost, standalonePost } from './posts.mjs'
import { createSite } from './site.mjs'
import { press } from './press.mjs'

/**
 * Glob, but returns a promise
 */
const globPromise = promisify(glob)

/**
 * Generates the give file / key and saves it to the disk as necessary
 * @param site the site object
 * @param key the key or file to generate
 * @returns the data associated with the file / key
 */
export async function generate (site, key) {
  let result = await getData(site, key)
  if (result === null) {
    console.warn(`rule for ${key} not found`)
    return null
  }

  if (!key.startsWith('$')) {
    const inPublic = minimatch(key, 'public/**/*')
    const inBuild = minimatch(key, 'build/**/*')

    if (inPublic || inBuild) {
      if (inPublic) {
        result = await press(site, key, result)
      }
      writeFileMkdirs(key, result)
    }
  }
  return result
}

/**
 * Gets the data associated with the file / key
 * @param {*} site the site object
 * @param {*} key the file / key
 * @returns the data associated with the file / key
 */
async function getData (site, key) {
  let result

  if (key === '$main') {
    return await generatePublic(site)
  }

  if (key === '$postData') {
    return await extractPostData(site, key)
  }

  if (key.startsWith('$')) {
    return null
  }

  for (const copy of Object.getOwnPropertyNames(site.config.copies)) {
    if (path.normalize(copy) === path.normalize(key)) {
      return await generate(site, site.config.copies[copy])
    }
  }

  if (minimatch(key, 'includes/**/*')) {
    return (await readFile(key)).toString()
  }

  if (minimatch(key, 'public/**/*')) {
    const file = path.join('src', path.relative('public', key))

    if (await exists(file)) {
      return await srcData(site, key)
    }
  }

  if (minimatch(key, 'build/posts/**/*.html')) {
    return await intermediatePost(site, key)
  }

  if (minimatch(key, 'public/posts/**/*.html')) {
    return await standalonePost(site, key)
  }

  result = await paginate(site, key, true)
  if (result !== null) {
    return result
  }

  result = await paginate(site, key, false)
  if (result !== null) {
    return result
  }

  return null
}

/**
 * Generates all the data in the public folder
 * @param site the site object
 */
async function generatePublic (site) {
  let file
  // everything that is just in the src folder
  for (file of await globPromise('src/**/*', { nodir: true })) {
    file = path.join('public', path.relative('src', file))
    await generate(site, file)
  }
  const postData = await generate(site, '$postData')
  // all of the standalone post pages
  for (const post of postData.posts) {
    file = path.join('public/posts', path.relative('build/posts', post.path))
    await generate(site, file)
  }
  // all of the paginates, both embedded and standalone
  for (let i = 0; i < postData.totalPaginates; i++) {
    file = path.join('public', site.config.paginate.embedded.output.replace('${i}', i))
    await generate(site, file)
    file = path.join('public', site.config.paginate.standalone.output.replace('${i}', i))
    await generate(site, file)
  }

  for (const copy of Object.getOwnPropertyNames(site.config.copies)) {
    await generate(site, copy)
  }
}

/**
 * Generates data that originates from the source directory and is
 * copied to the public directory
 * @param {*} site the site object
 * @param {*} key the filename in the public directory
 * @returns
 */
async function srcData (site, key) {
  const file = path.join('src', path.relative('public', key))

  let contents = await readFile(file)

  // ejs render certain files
  if (path.extname(key) === '.html' ||
        path.normalize(key) === path.normalize('public/script.js') ||
        path.normalize(key) === path.normalize('public/style.css')) {
    contents = await ejs.render(contents.toString(), site.ejsData, { async: true })
  }
  return contents
}

/**
 * Determines if a file exists
 * @param file the file to check
 * @returns if the file exists
 */
async function exists (file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

/**
 * writes to a file while making any necessary parent directories
 */
async function writeFileMkdirs (pathname, contents) {
  await mkdir(path.dirname(pathname), {
    recursive: true
  })
  await writeFile(pathname, contents)
}

/**
 * the main task that builds the entire website
 */
async function build () {
  const start = Date.now()
  const site = await createSite()

  // clean the website prior to generating anything
  if (await exists('dist/')) {
    await rm('public', {
      recursive: true
    })
  }

  // causes the router to generate the '$main' file, which in turn generates the entire site
  await generate(site, '$main')

  console.log(`finished build in ${(Date.now() - start) / 1000} s`)
}

build().catch(console.err)
