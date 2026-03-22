import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import SplashCursor from '../../components/SplashCursor';
import FloatingLines from '../../components/FloatingLines';

const MainLayout = () => {
  const { pathname } = useLocation();
  const isHomePage = pathname === '/';

  return (
    <div className="relative min-h-screen bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container overflow-x-hidden">
      {isHomePage && (
        <SplashCursor
          SIM_RESOLUTION={64}
          DYE_RESOLUTION={512}
          PRESSURE_ITERATIONS={12}
          SPLAT_FORCE={3500}
          COLOR_UPDATE_SPEED={6}
          SHADING={false}
        />
      )}
      {isHomePage && <div className="fixed inset-0 z-[100] scanlines pointer-events-none" aria-hidden="true" />}

      <div className="fixed inset-0 z-0 pointer-events-none opacity-55" aria-hidden="true">
        <FloatingLines
          linesGradient={['#1e0a0f', '#2b0f15', '#3a1620']}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[3, 5, 4]}
          lineDistance={[22, 26, 22]}
          animationSpeed={0.18}
          interactive={false}
          parallax={false}
          mixBlendMode="soft-light"
          maxFPS={24}
          quality={1}
        />
      </div>

      <div className="fixed inset-0 pointer-events-none -z-10 opacity-20" aria-hidden="true">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, #c1121f 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-primary-container/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] bg-tertiary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main className={`${isHomePage ? 'pt-24' : 'pt-28'} min-h-screen`}>
          <Outlet />
        </main>

        <Footer />
      </div>

      {isHomePage && (
        <>
          <div className="fixed top-4 left-4 w-2 h-2 bg-primary-container/40 z-50" />
          <div className="fixed top-4 right-4 w-2 h-2 bg-primary-container/40 z-50" />
          <div className="fixed bottom-4 left-4 w-2 h-2 bg-primary-container/40 z-50" />
          <div className="fixed bottom-4 right-4 w-2 h-2 bg-primary-container/40 z-50" />
        </>
      )}
    </div>
  );
};

export default MainLayout;
