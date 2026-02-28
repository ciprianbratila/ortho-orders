/**
 * Script de migrare baza de date Supabase
 * 
 * Utilizare: npm run db:migrate
 * 
 * Execută toate fișierele SQL din folderul supabase/ în ordine:
 *   1. schema.sql   - tabelele + seed data
 *   2. functions.sql - funcții stored procedures
 * 
 * Necesită variabila DATABASE_URL în fișierul .env
 */

import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dns from 'dns'

// Force IPv6 resolution (Supabase direct DB only resolves to IPv6)
dns.setDefaultResultOrder('verbatim')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const supabaseDir = path.join(rootDir, 'supabase')

// Citește .env manual (fără dotenv)
function loadEnv() {
    const envPath = path.join(rootDir, '.env')
    if (!fs.existsSync(envPath)) {
        console.error('❌ Fișierul .env nu a fost găsit!')
        console.error('   Creați un fișier .env cu variabila DATABASE_URL')
        process.exit(1)
    }
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim()
            const value = trimmed.substring(eqIdx + 1).trim()
            if (!process.env[key]) {
                process.env[key] = value
            }
        }
    }
}

loadEnv()

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    console.error('❌ Variabila DATABASE_URL lipsește din .env!')
    console.error('   Găsește-o în Supabase → Settings → Database → Connection string → URI')
    console.error('   Exemplu: postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres')
    process.exit(1)
}

// Fișierele SQL în ordinea de execuție
const SQL_FILES = [
    'schema.sql',
    'functions.sql',
    '002_add_tip_produse.sql',
    '003_password_hash_angajat_user.sql',
]

async function runMigrations() {
    console.log('🔄 Conectare la baza de date Supabase...\n')

    // Resolve hostname to IPv6 manually since getaddrinfo fails
    const url = new URL(databaseUrl)
    const hostname = url.hostname

    let resolvedAddress = null
    try {
        const { resolve6 } = await import('dns/promises')
        const addresses = await resolve6(hostname)
        if (addresses.length > 0) {
            resolvedAddress = addresses[0]
            console.log(`📡 Rezolvat ${hostname} → [${resolvedAddress}]`)
        }
    } catch (e) {
        console.log(`⚠️  Nu s-a putut rezolva IPv6 pentru ${hostname}, se încearcă direct...`)
    }

    const clientConfig = {
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    }

    // If we resolved an IPv6, override the host directly
    if (resolvedAddress) {
        clientConfig.host = resolvedAddress
        clientConfig.port = parseInt(url.port) || 5432
        clientConfig.database = url.pathname.slice(1) || 'postgres'
        clientConfig.user = url.username
        clientConfig.password = decodeURIComponent(url.password)
        delete clientConfig.connectionString
    }

    const client = new pg.Client(clientConfig)

    try {
        await client.connect()
        console.log('✅ Conectat cu succes!\n')

        for (const sqlFile of SQL_FILES) {
            const filePath = path.join(supabaseDir, sqlFile)
            if (!fs.existsSync(filePath)) {
                console.log(`⚠️  Fișierul ${sqlFile} nu există, se sare.`)
                continue
            }

            const sql = fs.readFileSync(filePath, 'utf-8')
            console.log(`📄 Execut: ${sqlFile} ...`)

            try {
                await client.query(sql)
                console.log(`   ✅ ${sqlFile} executat cu succes!`)
            } catch (err) {
                console.error(`   ❌ Eroare în ${sqlFile}:`)
                console.error(`      ${err.message}`)
                // Continuăm cu următorul fișier
            }

            console.log('')
        }

        console.log('🎉 Migrarea s-a finalizat cu succes!')
    } catch (err) {
        console.error('❌ Eroare la conectare:', err.message)
        process.exit(1)
    } finally {
        await client.end()
    }
}

runMigrations()
