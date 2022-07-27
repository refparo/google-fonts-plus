# Google Fonts+

A proxy with enhanced API for Google Fonts.

## Usage

In the Google Fonts CSS API URL, replace `//fonts.googleapis.com/css2` with `//fonts.paro.one/api`.

## Advanced Usage

In addition to [the Google Fonts CSS API spec](https://developers.google.com/fonts/docs/css2#api_url_specification), you can use some extra customization in each `<spec>`. Now the syntax of `<spec>` have become this:

```text
<spec> ::= <family_name>[:[<axis_tag_list>@<axis_tuple_list>][:<rule>@<rule_arg>...]]
<rule> ::= rename  // rename the font family as `rule_arg`. The original
                   // font would be preserved as-is, i.e. the following
                   // rules would only apply to the renamed font.
         | exclude // exclude `rule_arg` from the original `unicode-range`
         | include // replace the original `unicode-range` with `rule_arg`.
                   // This rule overrides `exclude` rule.
```

If you do not need to specify any axis but want to use the extra rules, please omit the `[<axis_tag_list>@<axis_tuple_list>]` part but keep the colon `:` there.

For example,

```
https://fonts.paro.one/api?family=Bitter::rename@Bitter+Mod:exclude@U%2BB7,U%2B2013-2014&display=swap
```

would give you two `@font-face`s:

- `Bitter`, the original font from Google, and
- `Bitter Mod`, the original font with ‘·’ `U+B7 MIDDLE DOT`, ‘–’ `U+2013 EN DASH` and ‘—’ `U+2014 EM DASH` excluded.
