// import { NextResponse } from 'next/server';
// import { writeFile, mkdir } from 'fs/promises';
// import { join } from 'path';
// import { v4 as uuidv4 } from 'uuid';
// import { pool } from '@/lib/db';
// import jwt from 'jsonwebtoken';

// export const dynamic = 'force-dynamic';

// export async function POST(req) {
//   try {
//     // 🖼️ Extract photo from formData
//     const formData = await req.formData();
//     const file = formData.get('photo');
//     if (!file) {
//       return NextResponse.json({ error: 'No file found' }, { status: 400 });
//     }

//     // 🔐 Get token from cookies
//     const token = req.cookies.get('token')?.value;
//     if (!token) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // ✅ Decode user ID from JWT
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const userId = decoded.id;

//     // 💾 Prepare file for saving
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);
//     const ext = file.name.split('.').pop();
//     const filename = `${uuidv4()}.${ext}`;

//     const uploadPath = join(process.cwd(), 'public', 'uploads');
//     await mkdir(uploadPath, { recursive: true }); // ✅ ensure folder exists
//     await writeFile(join(uploadPath, filename), buffer); // ✅ write image file

//     // 🛠️ Update DB with filename
//     const client = await pool.connect();
//     try {
//       await client.query(
//         `UPDATE users
//          SET photo = COALESCE(photo, '[]'::jsonb) || to_jsonb($1::text)
//          WHERE id = $2`,
//         [filename, userId]
//       );
//     } finally {
//       client.release();
//     }

//     return NextResponse.json({ message: '✅ Photo uploaded', filename });
//   } catch (err) {
//     console.error('❌ Upload error:', err);
//     return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
//   }
// }
