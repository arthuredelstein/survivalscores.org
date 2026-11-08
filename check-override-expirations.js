#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const overrides = pkg.overrides ?? {}
const meta = pkg.overridesMeta ?? {}

function overrideKeys (value, prefix = '') {
  return Object.entries(value).flatMap(([name, spec]) => {
    const key = prefix ? `${prefix}.${name}` : name
    if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
      return overrideKeys(spec, key)
    }
    return [key]
  })
}

const keys = overrideKeys(overrides)
const today = new Date()
today.setHours(0, 0, 0, 0)

const missing = keys.filter((key) => !meta[key]?.expires)
const expired = keys.flatMap((key) => {
  const expires = meta[key]?.expires
  if (!expires) return []
  const date = new Date(`${expires}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return [{ key, expires, reason: 'invalid date' }]
  }
  if (date < today) {
    return [{ key, expires, reason: meta[key]?.reason }]
  }
  return []
})

if (missing.length) {
  console.error('overrides missing overridesMeta.expires:')
  for (const key of missing) console.error(`  - ${key}`)
}

if (expired.length) {
  console.error('expired dependency overrides (remove or renew):')
  for (const item of expired) {
    const why = item.reason ? ` — ${item.reason}` : ''
    console.error(`  - ${item.key} (expired ${item.expires})${why}`)
  }
}

if (missing.length || expired.length) {
  process.exit(1)
}

console.log(`override expirations ok (${keys.length})`)
