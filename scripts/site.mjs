import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { parse as toHTML } from 'marked'
import * as ejs from 'ejs'
import { generate } from './build.mjs'

/**
 * creates a site object. This is the object which holds references to many
 * central objects. The config property is the parsed contents of the
 * config.json file. The  ejsData property is the data argument for ejs
 * functions.
 */
export async function createSite () {
  const config = JSON.parse(await readFile('config.json'))

  const lib = {
    /**
     * returns an ejs rendered page.
     * @param file the path to the file to include
     * @param args the args variable will be set to this argument
     * @param noPreprocess optional. if true, the file will be returned as
     *         it appears in the file system, and will not be rendered via ejs
     */
    includePage: async function (file, args, noPreprocess) {
      const data = (await generate(self, file)).toString()
      if (noPreprocess) {
        return data
      } else {
        return await ejs.render(data, {
          lib,
          args,
          config
        }, {
          async: true
        })
      }
    },
    /**
     * same as include page, but the file is in the 'includes' folder
     */
    include: async function (file, args) {
      return await lib.includePage(path.join('includes', file), args)
    },
    /**
     * formats the given date
     * @param date the date in the frontmatter 'YEAR-MONTH-DAY' format
     * @return a date in the pretty 'Month day, year' format
     */
    date: function (date) {
      return timeToStr(strToTime(date))
    },
    /**
     * takes a markdown string and converts it into HTML
     */
    markdown: function (content) {
      return toHTML(content)
    },
    /**
     * returns what the router generates for the given key
     */
    generate: async function (key) {
      return await generate(self, key)
    },
    maybeResolve,
    args: null
  }

  const self = {
    ejsData: {
      lib,
      args: null,
      config
    },
    config
  }

  return self
}

const INT_REGEX = /[0-9]+/

function isInt (x) {
  return INT_REGEX.test(x)
}

/**
 * converts a date in a string format to a time object.
 * The string is in the format 'YEAR-MONTH-DAY' or 'YEAR-MONTH-DAY-HOUR-MINUTE'
 * where 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE' are all integers.
 * The time objects has the properties of 'year', 'month', 'day', 'hour' and 'minute'
 */
function strToTime (str) {
  const parts = str.split('-')
  if ((parts.length !== 3 && parts.length !== 5) || !parts.every(isInt)) {
    throw (new Error('invalid date'))
  }
  return {
    year: parseInt(parts[0]),
    month: parseInt(parts[1]),
    day: parseInt(parts[2]),
    hour: parseInt(parts[3]),
    minute: parseInt(parts[4])
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

/**
 * converts a time object into a pretty string.
 */
function timeToStr (time) {
  let str = `${MONTHS[time.month - 1]} ${time.day}, ${time.year}`
  if (time.hour && time.minute) {
    const pm = time.hour > 12
    const hour = pm ? time.hour - 12 : time.hour
    str = `${str} ${hour}:${time.minute} ${pm ? 'PM' : 'AM'}`
  }
  return str
}

async function maybeResolve (x) {
  return x instanceof Promise ? await x : x
}
