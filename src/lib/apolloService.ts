export interface CompanyEnrichment {
    name: string;
    industry: string;
    size: string;
    headcount: number;
    description: string;
    linkedin_url: string;
    logo_url: string;
}

export async function enrichCompanyByDomain(domain: string): Promise<CompanyEnrichment> {
    const apiKey = import.meta.env.VITE_APOLLO_API_KEY;

    if (!apiKey) {
        // If no API key, return mockup data for demonstration if domain is provided
        console.warn('Apollo API Key missing. Returning mock data.');
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    name: domain.split('.')[0].toUpperCase(),
                    industry: 'Technology',
                    size: '500-1000',
                    headcount: 750,
                    description: `Leading provider of solutions for ${domain}.`,
                    linkedin_url: `https://linkedin.com/company/${domain.split('.')[0]}`,
                    logo_url: `https://logo.clearbit.com/${domain}`
                });
            }, 1000);
        });
    }

    try {
        const response = await fetch(`https://api.apollo.io/v1/organizations/enrich?domain=${domain}`, {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json',
                'Api-Key': apiKey
            }
        });

        if (!response.ok) throw new Error('Enrichment failed');
        const data = await response.json();
        const org = data.organization || {};

        return {
            name: org.name || '',
            industry: org.industry || '',
            size: org.estimated_num_employees ? `${org.estimated_num_employees} employees` : '',
            headcount: org.estimated_num_employees || 0,
            description: org.short_description || '',
            linkedin_url: org.linkedin_url || '',
            logo_url: `https://logo.clearbit.com/${domain}`
        };
    } catch (error) {
        console.error('Apollo Enrichment error:', error);
        throw new Error('Failed to enrich company data.');
    }
}
