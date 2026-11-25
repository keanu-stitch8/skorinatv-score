/**
 * Neon memberi `sslmode=require`. pg v8 memperlakukannya sebagai verify-full, tapi pg v9 akan melemahkannya
 * ke semantik libpq (tanpa verifikasi sertifikat). Kunci ke verify-full agar sertifikat tetap diverifikasi.
 */
export function withVerifiedSsl(url) {
  return url.replace(/([?&])sslmode=require(?=&|$)/, '$1sslmode=verify-full');
}
