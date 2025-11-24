import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Supabase が自動で URL を処理するので、特別な処理は不要
  return NextResponse.redirect(new URL('/', request.url));
}
