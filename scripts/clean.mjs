import { rm } from 'node:fs/promises'

async function clean () {
  await rm('public/', {
    recursive: true
  })
  await rm('build/', {
    recursive: true
  })
}

clean().catch(console.err)
