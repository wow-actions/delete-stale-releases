# delete-stale-releases

Automatically delete stale releases.

Create `.github/workflows/delete-stale-releases.yml` in the default branch:

```yaml
name: Auto Assign
on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: wow-actions/delete-stale-releases@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          keep_latest_count: 3
          delete_tags: true
```

### Inputs

Various inputs are defined to let you configure the action:

> Note: [Workflow command and parameter names are not case-sensitive](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-commands-for-github-actions#about-workflow-commands).

| Name                 | Description                                                                                                                                                                                                                                                                                                                                                                             | Default  |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------|
| `GITHUB_TOKEN`       | The GitHub token for authentication                                                                                                                                                                                                                                                                                                                                                     |          |
| `dry-run`            | Only list releases and tags that will be deleted deleted                                                                                                                                                                                                                                                                                                                                | `false`  |
| `keep_latest_count`  | The number of latest releases be keeped (sorted by `created_at`) to keep, <br>`0` for delete all releases                                                                                                                                                                                                                                                                               | `3`      |
| `keep_latest_days`   | The day count from now and releases in which duration will be keeped                                                                                                                                                                                                                                                                                                                    |          |
| `delete_tags`        | Whether to delete tags associated to releases. Tags without any associated releases will not be deleted                                                                                                                                                                                                                                                                                 | `false`  |
| `key`                | The key of the release object and corresponding value will be matched with `include` and `exclude` pattern                                                                                                                                                                                                                                                                              | `'name'` |
| `include`            | The keyworld to match with the value specified by `key` and matched releases will be deleted                                                                                                                                                                                                                                                                                            |          |
| `exclude`            | The keyworld to match with the value specified by `key` and matched releases will be keeped                                                                                                                                                                                                                                                                                             |          |
| `include_draft`      | Whether draft releases should be deleted                                                                                                                                                                                                                                                                                                                                                | `true`   |
| `include_prerelease` | Whether prerelease releases should be deleted                                                                                                                                                                                                                                                                                                                                           | `true`   |
| `group`              | The regex or substring to generate the group name. Be matched with the release name and matched substring will be replaced with empty string and other strings be combined to group name. When `group` is specified the `keep_latest_count` and `keep_latest_days` will base on the grouped releases. It's useful to delete releases in mono-repo which contains releases of sub-repos. |          |

### Outputs

| Name       | Description                                                       |
|------------|-------------------------------------------------------------------|
| `releases` | The deleted releases converted to a string via `JSON.stringify`   |
| `tags`     | The deleted tags' name converted to a string via `JSON.stringify` |

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).
