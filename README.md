# delete-stale-releases

> Github Action to delete stale releases.

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
      - uses: bubkoo/delete-stale-releases@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          keep_latest_count: 3
          delete_tags: true
```

### Options

- `github_token`: Your GitHub token for authentication.
- `keep_latest_count`: Specifies the number of latest releases be keeped (sorted by `created_at`) to keep. Pass `0` if you want to delete all releases. Default `3`.
- `keep_latest_days`: Specifies the day count from now and releases in which duration will be keeped.
- `delete_tags`: Specifies whether to delete tags associated to older releases or not. Older tags without any associated releases will not be deleted. Default `false`.
- `key`: Specifies the key of the release object and corresponding value will be matched with `include` and `exclude` pattern. Default `'name'`.
- `include`: Specifies keyworlds to match with the value specified by `key` and matched releases will be deleted.
- `exclude`: Specifies keyworlds to match with the value specified by `key` and matched releases will not be keeped.
- `include_draft`: Specifies whether draft releases should be deleted or not. Default `true`.
- `include_prerelease`: Specifies whether prerelease releases should be deleted or not. Default `true`.
- `group`: Specifies the regex or substring to generate the group name. Work with the value specified by `key`, matched substring will be replaced with empty string and other strings be combined to group name. When `group` is specified the `keep_latest_count` and `keep_latest_days` will base on the grouped releases. It's useful to delete releases in mono-repo which contains releases of sub-repos.

## License

The scripts and documentation in this project are released under the [MIT License](LICENSE).
