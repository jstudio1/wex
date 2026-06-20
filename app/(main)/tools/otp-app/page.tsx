import Link from 'next/link';
import { Smartphone } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase';

type OTPApp = {
  id: number;
  app_id: string;
  name: string;
  name_thai: string;
  description?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  color?: string | null;
  is_published: boolean;
  display_order: number;
};

export default async function OTPAppPage() {
  const sb = createServiceClient();
  const { data: apps } = await sb
    .from('otp_apps')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  const publishedApps = (apps || []) as OTPApp[];
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">เลือกรับรหัสยืนยัน</h2>
        <p className="text-white/70 text-sm">เลือกแอพที่ต้องการรับรหัส OTP</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {publishedApps.map((app) => {
          const defaultColor = 'from-emerald-600 to-emerald-800';
          const gradientColor = app.color || defaultColor;
          
          return (
            <Link
              key={app.id}
              href={`/tools/otp-app/${app.app_id}`}
              className="group relative block"
            >
              <div className="card p-6 h-full flex flex-col items-center text-center space-y-4 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border-white/10">
                {/* Icon Section */}
                <div className="relative">
                  {app.image_url ? (
                    <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-2 border-white/10`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={app.image_url}
                        alt={app.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            target.style.display = 'none';
                            parent.innerHTML = '<div class="w-full h-full bg-gray-600/50 flex items-center justify-center"><span class="text-xs text-gray-400">No Image</span></div>';
                          }
                        }}
                      />
                    </div>
                  ) : app.icon_url ? (
                    <div className={`w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-2 border-white/10`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={app.icon_url}
                        alt={app.name}
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            target.style.display = 'none';
                            parent.innerHTML = '<div class="w-full h-full bg-gray-600/50 flex items-center justify-center"><span class="text-xs text-gray-400">No Icon</span></div>';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-600/50 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-2 border-gray-500/30">
                      <span className="text-xs text-gray-400">No Image</span>
                    </div>
                  )}
                  {/* Decorative ring */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
                </div>

                {/* Content Section */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors duration-300">
                    {app.name}
                  </h3>
                  {app.description && (
                    <p className="text-xs text-white/60 group-hover:text-white/80 transition-colors">
                      {app.description}
                    </p>
                  )}
                </div>

                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
