'use client';

import React from "react";
import { useRouter } from 'next/navigation';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { FaStar } from "react-icons/fa";

const TrustedCouplesSection = () => {
  const [stories, setStories] = React.useState([]);
  const [page, setPage] = React.useState(0);

  React.useEffect(() => {
    const fetchStories = async () => {
      try {
        console.log('🔍 Fetching success stories from API...');
        const res = await fetch("/api/success-stories");
        console.log('📡 API Response status:', res.status, res.ok);

        if (res.ok) {
          const data = await res.json();
          console.log('✅ API returned data:', data);
          console.log('📊 Number of stories:', data?.length);

          if (data && data.length > 0) {
            console.log('🎉 Setting stories from database:', data);
            setStories(data);
          } else {
            console.warn('⚠️ No stories in database, using fallback');
            // Fallback to static if no stories
            setStaticFallback();
          }
        } else {
          console.error('❌ API failed with status:', res.status);
          setStaticFallback();
        }
      } catch (error) {
        console.error('❌ Error fetching stories:', error);
        setStaticFallback();
      }
    };
    fetchStories();
  }, []);

  const setStaticFallback = () => {
    setStories([
      { id: 's1', couple_name: "MST. SADIA AKTER", story: "lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum soluta, veritatis vero deserunt.", image_url: "https://placehold.co/400x400/png?text=Couple+1", color: "#F44336" }, // Red accent
      { id: 's2', couple_name: "MIZANUR ISLAM", story: "lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum soluta, veritatis vero deserunt.", image_url: "https://placehold.co/400x400/png?text=Couple+2", color: "#FF9800" }, // Orange accent
      { id: 's3', couple_name: "MD. MAHIM MIYA", story: "lorem ipsum dolor sit amet consectetur adipisicing elit. Rerum soluta, veritatis vero deserunt.", image_url: "https://placehold.co/400x400/png?text=Couple+3", color: "#03A9F4" } // Blue accent
    ]);
  };

  // Colors cyclic
  const colors = ["#F44336", "#FF9800", "#03A9F4", "#9C27B0", "#E91E63", "#4CAF50"];

  // Pagination logic (show 3 at a time)
  const itemsPerPage = 3;
  const totalPages = Math.ceil(stories.length / itemsPerPage);
  const displayedStories = stories.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const handleNext = () => {
    setPage((prev) => (prev + 1) % totalPages);
  };

  const handlePrev = () => {
    setPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  return (
    <section className="py-5 position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #fff0f6 0%, #ffe3ec 100%)' }}>

      {/* Decorative Background Bokeh/Hearts */}
      <div className="position-absolute w-100 h-100 top-0 start-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', fontSize: '3rem', color: 'rgba(233, 30, 99, 0.1)' }}>♥</div>
        <div style={{ position: 'absolute', top: '20%', right: '15%', fontSize: '4rem', color: 'rgba(233, 30, 99, 0.05)' }}>♥</div>
        <div style={{ position: 'absolute', bottom: '15%', left: '20%', fontSize: '2rem', color: 'rgba(233, 30, 99, 0.08)' }}>♥</div>
        <div style={{ position: 'absolute', top: '50%', right: '5%', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(233,30,99,0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(233,30,99,0.05) 0%, transparent 70%)', borderRadius: '50%' }}></div>
      </div>

      <div className="container text-center position-relative" style={{ zIndex: 1 }}>
        <p className="text-primary text-uppercase fw-bold small mb-2 ls-2">Trusted Brand</p>
        <h2 className="fw-bold mb-5 text-maroon display-5 font-serif" style={{ color: '#4a1526' }}>Trust by {1600 + stories.length}+ Couples</h2>

        <div className="row justify-content-center align-items-center">

          {/* Left Arrow */}
          <div className="col-2 col-md-1 text-end">
            <button
              className="btn btn-outline-danger rounded-circle d-flex align-items-center justify-content-center shadow-sm nav-btn-pink"
              style={{ width: '50px', height: '50px', borderWidth: '2px', borderColor: '#ff8fb5', color: '#ff4081' }}
              onClick={handlePrev}
              disabled={totalPages <= 1}
            >
              <i className="bi bi-chevron-left fs-5"></i>
            </button>
          </div>

          {/* Cards Container */}
          <div className="col-8 col-lg-6">
            {/* Only showing 1 main highlighted story for this specific design look, 
                 or we could keep the grid. The image requested looks like a single carousel slide. 
                 Let's stick to showing 1 really nice card to match the reference perfectly, 
                 or a slider of them. The reference shows arrows flanking a single dominant card.
                 I will display just ONE card for the carousel effect as implied by the reference image. */}

            {(() => {
              // Determine current slide index item
              // We'll treat 'page' as the index of the single current item for this specific design
              const person = stories[page % stories.length] || stories[0];
              const color = person?.color || '#E91E63'; // Pink default

              return (
                <div className="position-relative mx-auto" style={{ maxWidth: '500px', marginTop: '60px' }}>

                  {/* Pink Bottom Layer/Shadow Effect */}
                  <div className="position-absolute start-50 translate-middle-x rounded-4"
                    style={{
                      bottom: '-15px',
                      width: '85%',
                      height: '50px',
                      background: 'linear-gradient(90deg, #ff80ab, #ff4081)',
                      zIndex: 0
                    }}></div>

                  {/* Main Card */}
                  <div className="bg-white rounded-5 shadow-lg p-5 pt-5 position-relative text-center" style={{ zIndex: 1, minHeight: '320px' }}>

                    {/* Floating Quote Icon */}
                    <div className="position-absolute" style={{ top: '40px', left: '30px' }}>
                      <i className="bi bi-quote text-primary" style={{ fontSize: '3rem', opacity: 0.8 }}></i>
                    </div>

                    {/* Circular Top Image */}
                    <div className="position-absolute start-50 translate-middle" style={{ top: '0' }}>
                      <div className="rounded-circle p-1 bg-white shadow-sm" style={{ width: '130px', height: '130px' }}>
                        <img
                          src={person?.image_url || person?.img || 'https://placehold.co/400x400/E33183/FFFFFF/png?text=Happy+Couple'}
                          alt={person?.couple_name}
                          className="rounded-circle w-100 h-100 object-fit-cover"
                          style={{ border: `4px solid ${color}40` }}
                          onError={(e) => {
                            console.log('Image failed to load:', e.target.src);
                            e.target.src = 'https://placehold.co/400x400/E33183/FFFFFF/png?text=Happy+Couple';
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 pt-3">
                      {/* Rating */}
                      <div className="mb-3 text-warning">
                        {[...Array(5)].map((_, starIndex) => (
                          <FaStar key={starIndex} size={18} className="mx-1" />
                        ))}
                      </div>

                      <p className="text-secondary fst-italic mb-4 lh-lg" style={{ fontSize: '1.1rem' }}>
                        "{person?.story}"
                      </p>

                      <div className="border-top border-light pt-4 w-75 mx-auto">
                        <h5 className="fw-bold text-dark text-uppercase mb-1 ls-1">{person?.couple_name}</h5>
                        <small className="text-muted text-uppercase fw-bold text-smaller" style={{ fontSize: '0.75rem' }}>
                          {person?.marriage_date ? new Date(person.marriage_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'September 2023'}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right Arrow */}
          <div className="col-2 col-md-1 text-start">
            <button
              className="btn btn-outline-danger rounded-circle d-flex align-items-center justify-content-center shadow-sm nav-btn-pink"
              style={{ width: '50px', height: '50px', borderWidth: '2px', borderColor: '#ff8fb5', color: '#ff4081' }}
              onClick={() => setPage(p => (p + 1) % stories.length)}
            >
              <i className="bi bi-chevron-right fs-5"></i>
            </button>
          </div>
        </div>

        <div className="mt-5">
          {/* Pagination Dots */}
          <div className="d-flex justify-content-center gap-2">
            {stories.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setPage(idx)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: idx === page % stories.length ? '#ff4081' : '#ffc1e3',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .ls-1 { letter-spacing: 1px; }
        .ls-2 { letter-spacing: 2px; }
        .font-serif { font-family: 'Playfair Display', serif; }
        
        .nav-btn-pink:hover {
          background-color: #ff4081 !important;
          color: white !important;
          border-color: #ff4081 !important;
          transform: scale(1.1);
        }
      `}</style>
    </section>
  );
};

const MatrimonyMidPage = () => {
  const router = useRouter();

  return (
    <>


      {/* 2. How OrdhekDeen Works Section (Dark Maroon Background) */}
      <section className="py-5 text-white bg-maroon">
        <div className="container text-center">
          <p className="mb-2 text-uppercase small" style={{ letterSpacing: "1px", color: 'var(--brand-light-pink)' }}>How It Works</p>
          <h2 className="fw-bold mb-5">How We Help You Connect</h2>

          <div className="row justify-content-center g-4">
            {[
              { icon: "bi-person-plus", title: "Create BioData", text: "Create your biodata for free and distinct." },
              { icon: "bi-search", title: "Search Member", text: "Search your preference and find right one." },
              { icon: "bi-telephone", title: "Contact", text: "Contact with the perfect match you found." },
              { icon: "bi-heart", title: "Get Married", text: "Start your new life with your soulmate." },
            ].map((step, index) => (
              <div key={index} className="col-md-6 col-lg-3">
                <div className="bg-white text-dark rounded-4 p-4 h-100 position-relative">
                  <div className="mb-3">
                    <i className={`bi ${step.icon} text-primary`} style={{ fontSize: "2.5rem" }}></i>
                  </div>
                  <h5 className="fw-bold fs-6">{step.title}</h5>
                  <p className="small text-muted mb-0">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Trusted By Couples (Dynamic) */}
      <TrustedCouplesSection />

      {/* 4. Why Choose Us (Dark Section) */}
      <section className="py-5 text-white bg-maroon">
        <div className="container text-center">
          <h2 className="fw-bold mb-5">Why Choose Us</h2>
          <p className="mb-5 opacity-75 mx-auto" style={{ maxWidth: '600px' }}>
            Your privacy and security are our top priority. We ensure a safe environment for you to find your partner.
          </p>

          <div className="row justify-content-center">
            <div className="col-md-4 mb-4">
              <div className="p-3 bg-white text-dark rounded shadow-sm">
                <i className="bi bi-shield-lock-fill display-4 text-primary mb-3"></i>
                <h5>100% Privacy</h5>
                <p className="small text-muted">We respect your privacy and give you full control over who sees your profile.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="p-3 bg-white text-dark rounded shadow-sm">
                <i className="bi bi-check-circle-fill display-4 text-success mb-3"></i>
                <h5>Verified Profiles</h5>
                <p className="small text-muted">All profiles are manually screened to ensure you meet real people.</p>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="p-3 bg-white text-dark rounded shadow-sm">
                <i className="bi bi-chat-heart-fill display-4 text-primary mb-3"></i>
                <h5>Easy Communication</h5>
                <p className="small text-muted">Start a conversation with your match through our secure messaging system.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Welcome & Stats Section */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-5 mb-4 mb-lg-0">
              <div className="position-relative">
                <img src="/Image_02/hindu.jpg" alt="Welcome" className="img-fluid rounded-4 shadow-lg" />
                <div className="position-absolute bottom-0 end-0 bg-white p-3 rounded-top-4 shadow m-3 text-center">
                  <h3 className="fw-bold text-primary mb-0">10+</h3>
                  <small className="text-muted fw-bold">Years of Trust</small>
                </div>
              </div>
            </div>
            <div className="col-lg-7 ps-lg-5">
              <h4 className="text-uppercase text-primary fw-bold small mb-2">Welcome to Matrimony</h4>
              <h2 className="display-6 fw-bold mb-4 text-maroon">
                Find Your Special Someone With Us
              </h2>
              <p className="text-muted mb-4">
                We understand that marriage is not just about two people but about two families coming together. Our platform is designed to help you find a partner who shares your values and beliefs.
              </p>

              <div className="row g-4 text-center mt-4 border-top pt-4">
                <div className="col-6 col-sm-3">
                  <h3 className="fw-bold mb-0">5,185</h3>
                  <small className="text-muted">Total Profiles</small>
                </div>
                <div className="col-6 col-sm-3">
                  <h3 className="fw-bold mb-0">2,184</h3>
                  <small className="text-muted">Happy Couples</small>
                </div>
                <div className="col-6 col-sm-3">
                  <h3 className="fw-bold mb-0">5,165</h3>
                  <small className="text-muted">Verified Users</small>
                </div>
                <div className="col-6 col-sm-3">
                  <h3 className="fw-bold mb-0">1,800+</h3>
                  <small className="text-muted">Weddings</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h6 className="text-primary fw-bold text-uppercase mb-1">Our Gallery</h6>
              <h2 className="fw-bold text-maroon">Photo Gallery</h2>
            </div>
            <button className="btn btn-outline-primary btn-sm rounded-pill">View All</button>
          </div>

          <div className="row g-3">
            <div className="col-md-4">
              <img src="/Image_02/mab.jpg" alt="Gallery 1" className="img-fluid rounded shadow-sm w-100 h-100 object-fit-cover" style={{ minHeight: '250px' }} />
            </div>
            <div className="col-md-4">
              <img src="/Image_02/hindu.jpg" alt="Gallery 2" className="img-fluid rounded shadow-sm w-100 h-100 object-fit-cover" style={{ minHeight: '250px' }} />
            </div>
            <div className="col-md-4">
              <img src="/Image_02/matromon.jpg" alt="Gallery 3" className="img-fluid rounded shadow-sm w-100 h-100 object-fit-cover" style={{ minHeight: '250px' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer is likely in layout or separate component, but let's confirm */}
    </>
  );
};

export default MatrimonyMidPage;
