import * as core from '@actions/core'
import * as github from '@actions/github'
import anymatch from 'anymatch'
import { Util } from './util'

export namespace Action {
  export async function run() {
    const { context } = github
    const dryRun = core.getBooleanInput('dry-run')
    const key = (core.getInput('key') || 'name') as 'name' | 'tag_name'
    const group = core.getInput('group')
    const keepLatestCount = core.getInput('keep_latest_count') || '3'
    const keepLatestDays = core.getInput('keep_latest_days')
    const deleteTags = core.getInput('delete_tags') === 'true'
    const draft = core.getInput('include_draft') !== 'false'
    const prerelease = core.getInput('include_prerelease') !== 'false'

    let keepedCount = parseInt(keepLatestCount, 10)
    if (Number.isNaN(keepedCount) || !Number.isFinite(keepedCount)) {
      keepedCount = 3
    }

    let keepedDays = keepLatestDays ? parseInt(keepLatestDays, 10) : 0
    if (Number.isNaN(keepedDays) || !Number.isFinite(keepedDays)) {
      keepedDays = 0
    }

    const includes = Util.getFilter('include')
    const excludes = Util.getFilter('exclude')

    core.debug(`includes: ${JSON.stringify(includes, null, 2)}`)
    core.debug(`excludes: ${JSON.stringify(excludes, null, 2)}`)

    const octokit = Util.getOctokit()
    const all = await Util.getAllReleases(octokit)
    const releases = all.filter((release) => {
      const val = release[key] || ''
      const included = includes.length <= 0 || anymatch(includes, val)
      if (included) {
        if (release.draft && !draft) {
          return false
        }

        if (release.prerelease && !prerelease) {
          return false
        }

        return excludes.length <= 0 || !anymatch(excludes, val)
      }

      return false
    })

    core.info(`Filtered releases count: ${releases.length}`)
    core.debug(
      `Filtered Releases: ${JSON.stringify(
        releases.map((r) => r.tag_name),
        null,
        2,
      )}`,
    )

    const deletedTags: string[] = []
    const deletedReleases: any[] = []

    const clean = async (items: typeof releases) => {
      let stales: typeof releases
      if (keepedDays > 0) {
        stales = items.filter((release) => {
          const now = new Date().getTime()
          const old = new Date(release.created_at).getTime()
          const days = (now - old) / (1000 * 60 * 60 * 24)
          return days > keepedDays
        })
      } else if (keepedCount < 0) {
        stales = items
      } else {
        items
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime(),
          )
          .slice(keepedCount)
      }

      for (let i = 0, l = stales!.length; i < l; i += 1) {
        const release = stales![i]
        if (!dryRun) {
          await octokit.rest.repos.deleteRelease({
            ...context.repo,
            release_id: release.id,
          })
        }

        if (deleteTags) {
          if (!dryRun) {
            await octokit.rest.git.deleteRef({
              ...context.repo,
              ref: `tags/${release.tag_name}`,
            })
          }

          deletedTags.push(release.tag_name)
          core.info(
            `Delete Release "${release.name}" and associated tag "${release.tag_name}"`,
          )
        } else {
          core.info(`Delete Release "${release.name}"`)
        }
        deletedReleases.push(release)
      }
    }

    if (group) {
      const groups: { [name: string]: typeof releases } = {}
      releases.forEach((release) => {
        const name = release.name
          ? release.name.replace(new RegExp(group, 'ig'), '')
          : ''
        if (!groups[name]) {
          groups[name] = []
        }

        groups[name].push(release)
      })

      const groupNames = Object.keys(groups)
      for (let i = 0, l = groupNames.length; i < l; i += 1) {
        core.info(`Delete releases in group: ${groupNames[i]}`)
        await clean(groups[groupNames[i]])
      }
    } else {
      await clean(releases)
    }

    if (deleteTags) {
      if (keepedDays <= 0 && keepedCount < 0) {
        core.info('Delete tags not associated with release')
        const tags = await Util.getAllTags(octokit)
        for (let i = 0; i < tags.length; i += 1) {
          const tag = tags[i]
          if (!dryRun) {
            await octokit.rest.git.deleteRef({
              ...context.repo,
              ref: `tags/${tag.name}`,
            })
          }
          deletedTags.push(tag.name)
          core.info(`Delete tag "${tag.name}"`)
        }
      }
    }

    core.setOutput('tags', deletedTags)
    core.setOutput('releases', deletedReleases)
  }
}
