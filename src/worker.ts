export type Family = {
  family: string,
  axis?: string,
  googleFamily: string,
  rename?: string,
  exclude?: string,
  include?: string
}

export const parseFamily = (f: string) => {
  const [family, axis, ...options] = f.split(':')
  const parsedOptions = Object.fromEntries(options.map(o => o.split('@')))
  return <Family> {
    ...parsedOptions,
    family, axis,
    googleFamily: axis ? `${family}:${axis}` : family
  }
}

export type FontFace = {
  'font-family': string,
  'font-style': string,
  'font-weight': string,
  'font-display'?: string,
  src: string,
  'unicode-range'?: string
}

export const parseCSS = (css: string) => Array.from((
  function* (): Generator<FontFace> {
    for (const [str] of css.matchAll(/@font-face {.*?}/gms))
      yield {
        'font-family': str.match(/^\s*font-family: (.*);$/m)![1],
        'font-style': str.match(/^\s*font-style: (.*);$/m)![1],
        'font-weight': str.match(/^\s*font-weight: (.*);$/m)![1],
        'src': str.match(/^\s*src: (.*);$/m)![1],
        'font-display': (str.match(/^\s*font-display: (.*);$/m) ?? [])[1],
        'unicode-range': (str.match(/^\s*unicode-range: (.*);$/m) ?? [])[1],
      }
  }
)())

export const generateCSS = (fontFaces: FontFace[]) => fontFaces.map(f =>
`@font-face {
  font-family: ${f['font-family']};
  font-style: ${f['font-style']};
  font-weight: ${f['font-weight']};
  ${f['font-display'] ? `font-display: ${f['font-display']};` : ''}
  src: ${f['src']};
  ${f['unicode-range'] ? `unicode-range: ${f['unicode-range']};` : ''}
}`).join('\n')

export type Range = [number, number][]

export const parseRange = (range: string): Range => range.split(',')
  .map(s => s.trim().split(/[+-]/).slice(1).map(c => Number.parseInt(c, 16)))
  .map(([b, e]) => [b, e ? e + 1 : b + 1])

export const minusRange = (lhs: Range, rhs: Range): Range =>
  Array.from(rhs.reduce<Iterable<[number, number]>>((res, [begin, end]) => (
    function* (): Generator<[number, number]> {
      for (const [b, e] of res)
        if (e <= begin || end <= b) yield [b, e]
        else {
          if (b < begin) yield [b, begin]
          if (end < e) yield [end, e]
        }
    }
  )(), lhs))

export const generateRange = (range: Range) => range
  .map(([a, b]) =>
    b - a == 1
    ? `U+${a.toString(16)}`
    : `U+${a.toString(16)}-${(b - 1).toString(16)}`)
  .join(", ")

export const modifyCSS = (fontFaces: FontFace[], families: Family[]) =>
  Array.from(families.reduce<Iterable<FontFace>>((res, family) => (
    function* (): Generator<FontFace> {
      for (const fontFace of res)
        if (fontFace['font-family'] == `'${family.family}'`) {
          if (family.rename) yield fontFace
          yield {
            ...fontFace,
            ...family.rename ? { 'font-family': `'${family.rename}'` } : {},
            ...family.exclude && fontFace['unicode-range'] ? {
              'unicode-range': generateRange(minusRange(
                parseRange(fontFace['unicode-range']),
                parseRange(family.exclude)
              ))
            } : {},
            ...family.include ? { 'unicode-range': family.include } : {},
          }
        } else yield fontFace
    }
  )(), fontFaces))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*'
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    let families = url.searchParams.getAll('family')
    if (families.length == 0) return new Response(
      "400 Bad Request: Missing font family",
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; charset=utf-8'
        }
      }
    )

    const googleURL = new URL(url)
    googleURL.protocol = 'https'
    googleURL.host = 'fonts.googleapis.com'
    googleURL.port = ''
    googleURL.pathname = 'css2'
    const parsedFamilies = families.map(parseFamily)
    googleURL.searchParams.delete('family')
    parsedFamilies.forEach(f => googleURL.searchParams.append('family', f.googleFamily))
  
    const googleResp = await fetch(googleURL, {
      headers: {
        'user-agent': request.headers.get('user-agent')!
      }
    })
    if (googleResp.status != 200) {
      return googleResp
    }

    return new Response(
      generateCSS(modifyCSS(parseCSS(await googleResp.text()), parsedFamilies)),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/css; charset=utf-8',
          'Cache-Control': 'max-age=86400, s-maxage=1, stale-while-revalidate'
        }
      }
    )
  }
}
