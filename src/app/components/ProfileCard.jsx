"use client";

export default function ProfileCard({ p, onView }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white flex gap-4">
      <div className="shrink-0">
        <img
          src={p.photo_url || p.photo || "/uploads/default.jpg"}
          alt={p.full_name}
          className="w-24 h-24 rounded-xl object-cover bg-gray-100"
          onError={(e) => (e.currentTarget.src = "/uploads/default.jpg")}
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{p.full_name || p.matri_id}</div>
          <div className="text-sm text-gray-500">Score {p.score}</div>
        </div>
        <div className="mt-1 text-sm text-gray-600">
          {p.gender} • Age {p.age || p.age_years} • Height {p.height_cm ?? "—"} cm
        </div>
        <div className="mt-1 text-xs text-gray-500">
          Religion {p.religion_id ?? "—"} • Caste {p.caste_id ?? "—"} • City {p.city_id ?? "—"}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            className="px-3 py-2 rounded-xl border hover:bg-gray-50"
            onClick={() => onView?.(p.user_id)}
          >
            View Profile
          </button>
          <span className="text-xs text-gray-500">{p.photo_count} photos</span>
        </div>
      </div>
    </div>
  );
}
