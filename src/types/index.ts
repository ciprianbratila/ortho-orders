// ============ Materii Prime ============
export interface MateriePrima {
    id: string
    denumire: string
    pret: number
    unitateMasura: string
    stoc: number
    createdAt: string
    updatedAt: string
}

// ============ Produse ============
export interface ComponentaProdus {
    materiePrimaId: string
    cantitate: number
}

export type TipProdus = 'produs' | 'serviciu'

export interface Produs {
    id: string
    tip: TipProdus
    denumire: string
    descriere: string
    produsParinteId?: string // produs de bază (nested product) — doar pentru produse, nu servicii
    componente: ComponentaProdus[] // componente materii prime — doar pentru produse, nu servicii
    pretManopera: number
    createdAt: string
    updatedAt: string
}

// ============ Documente Client ============
export interface DocumentClient {
    id: string
    tip: string // 'masuratori' | 'mulaj' | 'radiografie' | 'reteta' | 'altele'
    denumire: string
    numeDocument?: string
    fisierBase64?: string
    observatii: string
    createdAt: string
}

// ============ Clienti ============
export interface Client {
    id: string
    nume: string
    prenume: string
    cnp: string
    telefon: string
    email: string
    adresa: string
    documente?: DocumentClient[]
    createdAt: string
    updatedAt: string
}

// ============ Angajati ============
export interface Angajat {
    id: string
    nume: string
    prenume: string
    functie: string
    telefon: string
    email: string
    activ: boolean
    utilizatorId?: string
    createdAt: string
    updatedAt: string
}

// ============ Comenzi ============
export type StatusComanda = 'noua' | 'in_lucru' | 'finalizata' | 'livrata' | 'anulata'
export type MetodaPlata = 'cash' | 'card' | 'decizie_cas'

export interface ProdusComanda {
    produsId: string
    cantitate: number
    observatii: string
}

export interface DecizieCAS {
    numarDocument: string
    dataDocument: string
    valoare: number
    numeDocument?: string // numele fișierului atașat
    fisierBase64?: string // conținutul fișierului stocat ca base64
}

export interface Comanda {
    id: string
    numarComanda: string
    clientId: string
    tehnicianId?: string
    produse: ProdusComanda[]
    status: StatusComanda
    metodaPlata: MetodaPlata
    dataComanda: string
    dataLivrareEstimata: string
    dataLivrareEfectiva?: string
    avans: number
    decizieCAS?: DecizieCAS
    totalCalculat: number
    observatii: string
    createdAt: string
    updatedAt: string
}

// ============ Facturi ============
export type StatusFactura = 'emisa' | 'achitata' | 'anulata'

export interface LinieFactura {
    denumire: string
    cantitate: number
    pretUnitar: number
    total: number
}

export interface DateClientFactura {
    nume: string
    prenume: string
    cnp: string
    telefon: string
    email: string
    adresa: string
}

export interface Factura {
    id: string
    numarFactura: string
    comandaId: string
    numarComanda: string
    dateClient: DateClientFactura
    linii: LinieFactura[]
    subtotal: number
    tva: number // procentaj TVA (ex: 19)
    totalTVA: number
    totalFactura: number
    metodaPlata: MetodaPlata
    avans: number
    decizieCASValoare: number
    restPlata: number
    dataEmitere: string
    dataScadenta: string
    status: StatusFactura
    observatii: string
    createdAt: string
    updatedAt: string
}

// ============ Administrare / Permisiuni ============
export type ModulAcces = 'dashboard' | 'comenzi' | 'facturi' | 'clienti' | 'angajati' | 'produse' | 'materii-prime' | 'admin'

export interface GrupUtilizatori {
    id: string
    denumire: string
    descriere: string
    moduleAcces: ModulAcces[]
    createdAt: string
    updatedAt: string
}

export interface Utilizator {
    id: string
    username: string
    parola: string
    nume: string
    prenume: string
    email: string
    grupId: string
    activ: boolean
    createdAt: string
    updatedAt: string
}
