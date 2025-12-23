export default function Loading() {
  return (
    <div className="container py-5">
      <div className="loading-skeleton">
        {/* Header Skeleton */}
        <div className="mb-4">
          <div className="skeleton-box h-8 w-25 mb-2"></div>
          <div className="skeleton-box h-4 w-33"></div>
        </div>

        {/* Profile Cards Grid Skeleton */}
        <div className="row g-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
                {/* Image Skeleton */}
                <div className="skeleton-box" style={{ height: 280 }}></div>

                <div className="card-body p-4">
                  {/* Name */}
                  <div className="skeleton-box h-5 w-75 mb-2"></div>
                  {/* Info */}
                  <div className="skeleton-box h-4 w-50 mb-3"></div>
                  <div className="skeleton-box h-4 w-66 mb-3"></div>

                  {/* Buttons */}
                  <div className="d-flex gap-2 mt-3">
                    <div className="skeleton-box h-10 flex-grow-1"></div>
                    <div className="skeleton-box h-10 flex-grow-1"></div>
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
