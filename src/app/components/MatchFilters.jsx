"use client";

export default function MatchFilters({ state, setState }) {
  const set = (k, v) => setState(s => ({ ...s, [k]: v }));

  return (
    <aside className="w-full md:w-64 shrink-0 space-y-4">
      <div className="rounded-2xl border p-4 bg-white">
        <div className="font-semibold mb-2">Filters</div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.withPhoto === 1}
            onChange={e => set("withPhoto", e.target.checked ? 1 : 0)}
          />
          With photo
        </label>

        <div className="mt-3 text-sm">
          <div className="font-medium">Show profiles created</div>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-1"
            value={state.createdWithin}
            onChange={e => set("createdWithin", e.target.value)}
          >
            <option value="">Any time</option>
            <option value="day">Within a day</option>
            <option value="week">Within a week</option>
            <option value="month">Within a month</option>
          </select>
        </div>

        <div className="mt-3 text-sm">
          <div className="font-medium">Active within</div>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-1"
            value={state.activeWithin}
            onChange={e => set("activeWithin", e.target.value)}
          >
            <option value="">Any time</option>
            <option value="day">Within a day</option>
            <option value="week">Within a week</option>
            <option value="month">Within a month</option>
          </select>
        </div>

        <div className="mt-3 text-sm grid grid-cols-2 gap-2">
          <div>
            <div className="font-medium">Age min</div>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border px-2 py-1"
              value={state.ageMin}
              onChange={e => set("ageMin", Number(e.target.value || 18))}
            />
          </div>
          <div>
            <div className="font-medium">Age max</div>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border px-2 py-1"
              value={state.ageMax}
              onChange={e => set("ageMax", Number(e.target.value || 99))}
            />
          </div>
        </div>

        <div className="mt-3 text-sm">
          <div className="font-medium">Sort by</div>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-1"
            value={state.sort}
            onChange={e => set("sort", e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="last_seen">Last seen</option>
            <option value="age_asc">Age ↑</option>
            <option value="age_desc">Age ↓</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
