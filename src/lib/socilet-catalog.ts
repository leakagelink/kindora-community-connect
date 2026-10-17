// These are service scopes in the existing campaign, not separate guaranteed awards.
export const SOCILET_SERVICES = [
  { id: 'website', title: 'Website development', description: 'A business website with an agreed scope.', icon: 'website' },
  { id: 'web-app', title: 'Web app development', description: 'A browser-based application for your business.', icon: 'web-app' },
  { id: 'mobile-app', title: 'Mobile app development', description: 'A mobile application with approved features.', icon: 'mobile-app' },
] as const;

export function matchingSociletServices(search = '') {
  const term = search.trim().toLowerCase();
  return SOCILET_SERVICES.filter(service => `${service.title} ${service.description} Socilet digital services`.toLowerCase().includes(term));
}