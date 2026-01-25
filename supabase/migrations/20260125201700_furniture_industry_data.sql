-- Furniture Industry Seed Data
-- Migration: 20260125201700_furniture_industry_data.sql

-- Clear sample data and add furniture industry competitors
DELETE FROM competitors WHERE name IN ('Competitor A', 'Competitor B', 'Competitor C');

-- Insert furniture industry competitors
INSERT INTO competitors (name, description, website, headquarters, market_position, threat_level) VALUES
-- Office Furniture Competitors
('Steelcase', 'Global leader in office furniture and workspace solutions. Known for ergonomic chairs and modular systems.', 'https://www.steelcase.com', 'Grand Rapids, USA', 'leader', 'high'),
('Herman Miller', 'Premium office furniture manufacturer, famous for Aeron chair. Strong in high-end corporate market.', 'https://www.hermanmiller.com', 'Zeeland, USA', 'leader', 'high'),
('Haworth', 'Major office furniture manufacturer with strong presence in open office systems and adaptable workspaces.', 'https://www.haworth.com', 'Holland, USA', 'leader', 'medium'),
('Knoll', 'High-end office furniture with focus on design. Strong in executive and premium segments.', 'https://www.knoll.com', 'East Greenville, USA', 'challenger', 'medium'),
('HON', 'Value-oriented office furniture. Popular in mid-market and government sectors.', 'https://www.hon.com', 'Muscatine, USA', 'challenger', 'medium'),
-- Hospitality Furniture Competitors  
('Global Furniture Group', 'Large manufacturer serving both office and hospitality markets with wide product range.', 'https://www.globalfurnituregroup.com', 'Toronto, Canada', 'challenger', 'medium'),
('Kimball Hospitality', 'Specialized hospitality furniture for hotels, focusing on casegoods and seating.', 'https://www.kimball.com', 'Jasper, USA', 'niche', 'medium'),
('Bernhardt Hospitality', 'Premium hospitality furniture manufacturer known for quality and custom designs.', 'https://www.bernhardt.com', 'Lenoir, USA', 'niche', 'low'),
-- Regional/Import Competitors
('IKEA Business', 'Budget-friendly office and hospitality furniture. Strong in SMB market.', 'https://www.ikea.com/business', 'Delft, Netherlands', 'challenger', 'high'),
('Chinese Manufacturers', 'Various Chinese manufacturers offering low-cost imported furniture and chairs.', NULL, 'China', 'emerging', 'high');

-- Insert furniture industry objection scripts
INSERT INTO objection_scripts (objection, category, response, is_approved) VALUES
-- Pricing Objections
('Your prices are higher than Chinese imports', 'pricing', 
'While imported furniture may have lower upfront costs, consider the total cost of ownership: Our products come with 10-year warranties, local service support, faster delivery, and no import duties surprises. Additionally, our furniture is built to commercial standards with fire-retardant materials required for hotels and offices. Many clients find that one replacement of cheap furniture costs more than investing in quality from day one.', true),

('We found similar chairs for half the price', 'pricing',
'Price differences often reflect quality differences. Let me show you our chair''s features: commercial-grade mechanisms rated for 40,000+ cycles, high-density foam that maintains shape for years, and ergonomic certifications. Would you like me to provide a side-by-side comparison? We also offer volume discounts and financing options that can make premium furniture more accessible.', true),

('The quote is over our budget', 'pricing',
'I understand budget constraints are important. Let''s explore options: We can phase the project across quarters, prioritize high-traffic areas first, or look at our value line which offers similar aesthetics at lower price points. We also have refurbished/pre-owned options for some products. What''s most important to achieve within your budget?', true),

-- Quality/Features Objections
('How do I know your furniture will last in a hotel environment?', 'features',
'Great question for hospitality projects. Our furniture is specifically designed for high-traffic commercial use. We use: commercial-grade fabrics rated 100,000+ double rubs, reinforced joints and hardware, moisture-resistant finishes, and fire-retardant materials meeting all hotel codes. I can share case studies from hotels that have used our furniture for 10+ years. Would you like to visit one of our hotel installations?', true),

('We need customization but your lead times are too long', 'features',
'For custom projects, we offer several acceleration options: our quick-ship program has popular configurations ready in 2-3 weeks, we can phase deliveries starting with critical areas, and our local manufacturing allows faster turnaround than imported alternatives. What''s your ideal timeline? Let me see what we can do to meet it.', true),

-- Competitor Objections
('We''re considering Steelcase/Herman Miller for this project', 'competitor',
'Both are excellent companies. Here''s how we compare: similar quality and warranty terms, but with advantages in local service response time, competitive pricing (typically 15-20% lower), and flexibility for customization. We can provide the same ergonomic certifications. Would you like to see our products side-by-side? We''re confident our value proposition will stand out.', true),

('IKEA furniture is good enough for our needs', 'competitor',
'IKEA works well for home use. For commercial environments, consider: our furniture meets commercial fire codes (required for hotels/offices), has commercial-grade warranties, and is designed for 8+ hours daily use. IKEA furniture in commercial settings often needs replacement within 2-3 years. We can show you the cost-per-year comparison - quality commercial furniture often costs less over its lifespan.', true),

-- Delivery/Service Objections
('We need faster delivery than your standard lead time', 'support',
'Let me check our quick-ship inventory - we keep popular items in stock for faster delivery. For custom orders, I can expedite with our factory. We also offer partial shipments so you can start installing priority areas immediately. What''s your project timeline? Let me work out the fastest possible solution.', true),

('What happens if something breaks or needs repair?', 'support',
'Our service commitment is a key differentiator: 10-year warranty on structural components, 5-year on mechanisms and fabrics, local service technicians for on-site repairs within 48 hours, and a spare parts program for quick fixes. We also offer maintenance contracts for hotels and large installations. Your investment is fully protected.', true);

-- Insert sample battlecards
INSERT INTO battlecards (competitor_id, title, overview, target_market, pricing_model, strengths, weaknesses, win_strategies, key_differentiators, is_published)
SELECT 
    c.id,
    c.name || ' Battlecard',
    'Competitive analysis for ' || c.name,
    CASE 
        WHEN c.name = 'Steelcase' THEN 'Enterprise corporations, government, education'
        WHEN c.name = 'Herman Miller' THEN 'Premium corporate, tech companies, design-focused'
        WHEN c.name = 'IKEA Business' THEN 'SMB, startups, budget-conscious buyers'
        WHEN c.name = 'Chinese Manufacturers' THEN 'Price-sensitive buyers, bulk orders'
        ELSE 'Various commercial segments'
    END,
    CASE 
        WHEN c.name IN ('Steelcase', 'Herman Miller', 'Knoll') THEN 'Premium pricing, full-service model'
        WHEN c.name = 'IKEA Business' THEN 'Low price, self-service model'
        ELSE 'Competitive mid-market pricing'
    END,
    CASE 
        WHEN c.name = 'Steelcase' THEN '["Strong brand recognition", "Extensive product line", "Global presence", "Research-backed designs"]'::jsonb
        WHEN c.name = 'Herman Miller' THEN '["Iconic designs (Aeron chair)", "Premium quality", "Design awards", "Strong in tech sector"]'::jsonb
        WHEN c.name = 'IKEA Business' THEN '["Very low prices", "Immediate availability", "Brand recognition", "Easy online ordering"]'::jsonb
        WHEN c.name = 'Chinese Manufacturers' THEN '["Lowest prices", "High volume capacity", "Wide variety", "Flexible MOQ"]'::jsonb
        ELSE '["Established brand", "Good product range", "Competitive pricing"]'::jsonb
    END,
    CASE 
        WHEN c.name = 'Steelcase' THEN '["Premium pricing", "Long lead times", "Complex ordering process", "Less flexible for custom"]'::jsonb
        WHEN c.name = 'Herman Miller' THEN '["Very high prices", "Limited value options", "Perceived as overpriced", "Less hospitality focus"]'::jsonb
        WHEN c.name = 'IKEA Business' THEN '["Not commercial-grade", "No warranty support", "Assembly required", "Not fire-code compliant"]'::jsonb
        WHEN c.name = 'Chinese Manufacturers' THEN '["Quality inconsistency", "Long shipping times", "Import duties", "No local support", "Compliance risks"]'::jsonb
        ELSE '["Market-specific limitations", "Regional availability"]'::jsonb
    END,
    CASE 
        WHEN c.name = 'Steelcase' THEN '["Emphasize faster local delivery", "Highlight price advantage", "Offer comparable quality with better value", "Focus on service responsiveness"]'::jsonb
        WHEN c.name = 'Herman Miller' THEN '["Show similar ergonomic features at lower cost", "Emphasize hospitality expertise", "Highlight total cost of ownership", "Offer bundled solutions"]'::jsonb
        WHEN c.name = 'IKEA Business' THEN '["Focus on commercial-grade quality", "Warranty and compliance requirements", "Lifecycle cost comparison", "Professional installation"]'::jsonb
        WHEN c.name = 'Chinese Manufacturers' THEN '["Highlight quality and consistency", "Local support and warranty", "No hidden import costs", "Faster delivery", "Compliance assurance"]'::jsonb
        ELSE '["Emphasize local expertise", "Flexible customization", "Responsive service"]'::jsonb
    END,
    '["Local manufacturing and service", "Hospitality + Office expertise", "Custom design capability", "Competitive total cost", "10-year warranty"]'::jsonb,
    true
FROM competitors c
WHERE c.name IN ('Steelcase', 'Herman Miller', 'IKEA Business', 'Chinese Manufacturers');

COMMENT ON TABLE objection_scripts IS 'Furniture industry sales objection handling scripts';
