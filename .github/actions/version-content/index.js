const core = require('@actions/core')
const fs = require('fs-extra')
const shell = require('shelljs')
const path = require('path')

const { PREBUILD, SITE_REPO, CONTENT_REPO, BASE_REF, WORKSPACE } = process.env
let allVersions = []

const syncFiles = async (contentPath) => {
  const targetDir = path.join(
    WORKSPACE,
    PREBUILD,
    CONTENT_REPO,
    BASE_REF,
    contentPath
  )
  const sourceDir = path.join(WORKSPACE, 'tmp', contentPath)

  // Create target directory if it doesn't exist
  shell.mkdir('-p', targetDir)

  // Remove all files in target directory
  shell.rm('-rf', path.join(targetDir, '*'))

  const rsyncCommand =
    `rsync --ignore-missing-args -zavpm --no-l ` +
    `--exclude='cats.mdx' ` +
    `--exclude='infrastructure/ansible/systests/*' ` +
    `--include='*.docnav.json' ` +
    `--include='*.apidocs.json' ` +
    `--include='*.mdx' ` +
    `--include='*.png' ` +
    `--include='*.gif' ` +
    `--include='*.jpg' ` +
    `--include='*.svg' ` +
    `--include='*.jpeg' ` +
    `--include='*.webp' ` +
    `--include='*.devdocs.json' ` +
    `--include='*/' ` +
    `--exclude='*' ` +
    `"${sourceDir}/" ` +
    `"${targetDir}/"`

  if (shell.exec(rsyncCommand).code !== 0) {
    shell.echo('Error: Rsync failed')
    shell.exit(1)
  }
}

try {
  let config = {}
  const configPath = path.resolve(WORKSPACE, SITE_REPO, 'docsmobile.config.js')

  if (fs.existsSync(configPath)) {
    config = require(configPath)
  } else {
    throw new Error(
      'Unable to find docsmobile.config.js in the site repository.'
    )
  }

  const { sources, versioning } = config
  const { directories } = sources.find(({ repo }) => repo === CONTENT_REPO)

  directories.forEach(async ({ versioningSystem, path: contentPath }) => {
    if (versioning[versioningSystem].all.includes(BASE_REF)) {
      await syncFiles(contentPath)
      allVersions = versioning[versioningSystem].all
    }
  })
} catch (error) {
  core.setFailed(error.message)
}
