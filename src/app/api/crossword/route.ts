import { NextResponse } from 'next/server'
 
export async function GET() {
  const res = await fetch('https://gist.githubusercontent.com/teguhrianto/503284d176cea3b3e612771fecb60e61/raw/ad56df5e1b0e47c2ae170980b549cd729dbb3b38/crossword-data.json')
  const data = await res.json()
 
  return NextResponse.json(data)
}