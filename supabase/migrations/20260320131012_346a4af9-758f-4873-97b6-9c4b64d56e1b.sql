-- Create storage bucket for ad banners
INSERT INTO storage.buckets (id, name, public) VALUES ('ad-banners', 'ad-banners', true);

-- Allow anyone to view ad banners
CREATE POLICY "Anyone can view ad banners" ON storage.objects FOR SELECT USING (bucket_id = 'ad-banners');

-- Only global roles can upload
CREATE POLICY "Global roles can upload ad banners" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ad-banners' AND is_global_role(auth.uid()));

-- Only global roles can delete
CREATE POLICY "Global roles can delete ad banners" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ad-banners' AND is_global_role(auth.uid()));