import * as path from 'node:path'
import minimatch from 'minimatch'
import { promisify } from 'node:util'
import glob from 'glob'
import { readFile } from 'node:fs/promises'
import { parse as toHTML } from 'marked'
import * as ejs from 'ejs'

import { generate } from './build.mjs'

const globPromise = promisify(glob)

/**
 * splits a string's frontmatter from its content
 * @return the frontmatter property is an object whose keys and values
 *      correspond to str's frontmatter and body corresponds to the string's body
 */
function splitFrontMatter (str) {
  const beginIndex = str.indexOf('---')
  const endIndex = str.indexOf('---', beginIndex + 1)
  if (!str.trim().startsWith('---') || endIndex === -1) {
    // frontmatter does not exist
    return {
      frontMatter: {},
      body: str
    }
  }

  const frontMatter = {}
  const frontMatterStr = str.substring(beginIndex + '---'.length, endIndex)
  for (const line of frontMatterStr.split(/[\n\r]+/g)) {
    const parts = line.split(':')
    if (parts.length > 1) {
      frontMatter[parts[0].trim()] = parts[1].trim()
    }
  }
  return {
    frontMatter,
    body: str.substring(endIndex + '---'.length)
  }
}

/**
 * formats a post into an intermediate format that is used by other pages
 * @param key the filename of the post to output
 * @param file the path to the post's .md file
 * @param site the site object
 * @param postTemplatePath the path to the post template
 */
export async function intermediatePost (site, key) {
  const file = path.join('posts', path.relative('build/posts', key.slice(0, key.length - '.html'.length))) + '.md'
  const content = await readFile(file)
  const parts = splitFrontMatter(content.toString())
  const data = Object.assign({
    content: toHTML(parts.body),
    frontMatter: parts.frontMatter
  }, site.ejsData)
  const template = await compileTemplate('post.html')
  return template(data)
}

/**
 * formats a standalone post page
 * @param key the file name of the post to output
 * @param site the site object
 * @param templatePath the path to the standalone post template
 */
export async function standalonePost (site, key) {
  const template = await compileTemplate('standalonePost.html')
  const postData = await generate(site, '$postData')
  const file = path.join('build/posts', path.relative('public/posts', key))
  const data = Object.assign({
    post: {
      contents: await generate(site, file),
      title: postData.posts.find(post => path.normalize(file) === path.normalize(post.path)).title
    }
  }, site.ejsData)
  return await template(data)
}

/**
 * creates a rule that generates paginate files
 * @param site the site object
 * @param isEmbedded true if the paginate is embedded, false if standalone
 * @param cacher see doRule for details
 */
export async function paginate (site, key, isEmbedded) {
  let config
  if (isEmbedded) {
    config = site.config.paginate.embedded
  } else {
    config = site.config.paginate.standalone
  }
  const pathformat = path.join('public', config.output)

  // '${i}' is replaced with '<i>' since '{' and '}' are special characters
  // in regular expressions
  let re = new minimatch.Minimatch(pathformat.replace('${i}', '<i>')).makeRe()
  re = re.source.replace('<i>', '([0-9]+)').replace(new RegExp('\/', 'g'), path.sep)
  const matches = new RegExp(re).exec(path.normalize(key))
  if (matches === null) {
    return null
  }

  return await generatePaginate(site, isEmbedded, parseInt(matches[1]))
}

/**
 * generates a paginate page
 * @param key the file name of the paginate to generate
 * @param site the site object
 * @param isEmbedded true if the paginate is embedded (ie feeds), false if
 *      standalone
 * @param i the paginate's number
 */
async function generatePaginate (site, isEmbedded, i) {
  const config = site.config.paginate
  if (!config) {
    throw (new Error('paginate config not found'))
  }
  const postData = await generate(site, '$postData')
  const totalPages = postData.totalPaginates

  const embeddedTemplate = await createPaginateType(config.embedded, false)
  const standaloneTemplate = await createPaginateType(config.standalone, true)

  let template
  if (isEmbedded) {
    template = embeddedTemplate
  } else {
    template = standaloneTemplate
  }

  // the paginate template gets a special object
  const data = Object.assign({
    paginator: {
      nextPage: nextPage(embeddedTemplate, i, totalPages),
      nextStandalonePage: nextPage(standaloneTemplate, i, totalPages),
      previousStandalonePage: previousPage(standaloneTemplate, i),
      posts: postData.posts.slice(i * totalPages, (i + 1) * totalPages),
      page: i,
      totalPages
    }
  }, site.ejsData)

  return await template.template(data)
}

/**
 * creates a paginate object
 * @param the paginate's config
 */
async function createPaginateType (config) {
  return {
    template: await compileTemplate(config.template),
    path: config.output
  }
}

/**
 * returns the path to the paginate's next page
 * @param template the paginate object
 * @param i the current page
 * @parma totalPages the total amount of paginate pages
 */
function nextPage (template, i, totalPages) {
  if (i === totalPages - 1) {
    return null
  } else {
    return template.path.replace('${i}', i + 1)
  }
}

/**
 * returns the path to the paginate's previous page
 * @param template the paginate object
 * @param i the current page
 */
function previousPage (template, i) {
  if (i === 0) {
    return null
  } else {
    return template.path.replace('${i}', i - 1)
  }
}

/**
 * extracts the each post's frontmatter
 */
export async function extractPostData (site) {
  const posts = []
  for (const file of await globPromise('posts/**/*.md')) {
    const content = await readFile(file)
    const parts = splitFrontMatter(content.toString())
    const key = path.relative('posts', file).replace(/[.]md$/, '')
    if (key in posts) {
      throw (new Error(`duplicate post name: ${key}`))
    }
    posts.push(Object.assign({ path: path.join('build/posts', key + '.html') }, parts.frontMatter))
  }
  posts.sort(function (a, b) {
    const partsA = a.date.split('-').map(Number)
    const partsB = b.date.split('-').map(Number)
    for (let i = 0; i < 5; i++) {
      if (partsA[i] === undefined || partsB[i] === undefined) {
        break
      }
      if (partsA[i] < partsB[i]) {
        return -1
      } else if (partsA[i] > partsB[i]) {
        return 1
      }
    }
    throw new Error(`ambigious time order for ${a} and ${b}`)
  })
  posts.reverse() // so its newest to oldest
  return {
    posts,
    totalPaginates: Math.ceil(posts.length / site.config.paginate.postsPerPage)
  }
}

/**
 * reads the template in the includes folder and turns it into an ejs template
 */
async function compileTemplate (pathname) {
  const data = await readFile(path.join('includes', pathname))
  return ejs.compile(data.toString(), { async: true })
}
