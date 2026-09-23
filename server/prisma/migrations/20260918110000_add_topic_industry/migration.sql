ALTER TABLE "Topic" ADD COLUMN "industry" TEXT NOT NULL DEFAULT 'Khác';

UPDATE "Topic"
SET "industry" = CASE "slug"
  WHEN 'cong-nghe-chuyen-doi-so' THEN 'Công nghệ & hạ tầng'
  WHEN 'ai-tu-dong-hoa' THEN 'Công nghệ & hạ tầng'
  WHEN 'phan-mem-b2b-saas' THEN 'Công nghệ & hạ tầng'
  WHEN 'du-lieu-phan-tich' THEN 'Dữ liệu & tăng trưởng'
  WHEN 'cloud-ha-tang' THEN 'Công nghệ & hạ tầng'
  WHEN 'an-ninh-mang' THEN 'Công nghệ & hạ tầng'
  WHEN 'crm-ban-hang' THEN 'Kinh doanh & vận hành'
  WHEN 'marketing-tang-truong' THEN 'Dữ liệu & tăng trưởng'
  WHEN 'nang-suat-cong-tac' THEN 'Kinh doanh & vận hành'
  WHEN 'tich-hop-api' THEN 'Công nghệ & hạ tầng'
  WHEN 'thuong-mai-dien-tu-ban-le' THEN 'Thương mại & bán lẻ'
  WHEN 'nganh-use-case-doanh-nghiep' THEN 'Chiến lược & giải pháp'
  WHEN 'so-sanh-giai-phap-cong-nghe' THEN 'Chiến lược & giải pháp'
  WHEN 'roi-chi-phi-hieu-qua' THEN 'Chiến lược & giải pháp'
  ELSE "industry"
END;
