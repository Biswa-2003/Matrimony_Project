export default function Loading() {
  return (
    <div className="container py-5">
      <div className="loading-skeleton">
        {/* Search Header Skeleton */}
        <div className="text-center mb-5">
          <div className="skeleton-box h-8 w-33 mx-auto mb-3"></div>
          <div className="skeleton-box h-4 w-50 mx-auto"></div>
        </div>

        {/* Tabs Skeleton */}
        <div className="d-flex gap-3 justify-content-center mb-5">
          <div className="skeleton-box h-12" style={{ width: 180, borderRadius: 50 }}></div>
          <div className="skeleton-box h-12" style={{ width: 180, borderRadius: 50 }}></div>
          <div className="skeleton-box h-12" style={{ width: 180, borderRadius: 50 }}></div>
        </div>

        {/* Search Results Grid Skeleton */}
        <div className="row g-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                {/* Image Skeleton */}
                <div className="skeleton-box" style={{ height: 280 }}></div>

                <div className="card-body p-4">
                  {/* Name & ID */}
                  <div className="skeleton-box h-6 w-75 mb-2"></div>
                  <div className="skeleton-box h-4 w-33 mb-3"></div>

                  {/* Info Lines */}
                  <div className="skeleton-box h-4 w-100 mb-2"></div>
                  <div className="skeleton-box h-4 w-85 mb-2"></div>
                  <div className="skeleton-box h-4 w-66 mb-3"></div>

                  {/* Buttons */}
                  <div className="d-flex gap-2 mt-3">
                    <div className="skeleton-box h-10 flex-grow-1" style={{ borderRadius: 50 }}></div>
                    <div className="skeleton-box h-10" style={{ width: 100, borderRadius: 50 }}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
