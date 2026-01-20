# CERNIQ.APP — TESTE F1.13-F1.14: FRONTEND PAGES & COMPONENTS

## Teste pentru UI pages și components

**Faze:** F1.13, F1.14 | **Taskuri:** 18

---

## F1.13 PAGES

```typescript
describe('Dashboard Page', () => {
  it('should render stats cards', async () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('total-companies')).toBeInTheDocument();
    expect(screen.getByTestId('active-leads')).toBeInTheDocument();
  });
  
  it('should load data on mount', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/\d+ companies/)).toBeInTheDocument();
    });
  });
});

describe('Companies Page', () => {
  it('should render table', async () => {
    render(<CompaniesPage />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
  
  it('should paginate', async () => {
    render(<CompaniesPage />);
    await userEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });
  
  it('should filter by search', async () => {
    render(<CompaniesPage />);
    await userEvent.type(screen.getByPlaceholderText('Search...'), 'AGRO');
    await waitFor(() => {
      expect(screen.getByText('AGRO TEST SRL')).toBeInTheDocument();
    });
  });
});

describe('Import Page', () => {
  it('should upload CSV', async () => {
    render(<ImportPage />);
    const file = new File(['CUI,Denumire\n12345678,Test'], 'test.csv');
    await userEvent.upload(screen.getByLabelText('Upload file'), file);
    expect(screen.getByText('test.csv')).toBeInTheDocument();
  });
});
```

## F1.14 COMPONENTS

```typescript
describe('DataTable Component', () => {
  it('should render columns', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('CUI')).toBeInTheDocument();
  });
  
  it('should sort on column click', async () => {
    render(<DataTable columns={columns} data={data} />);
    await userEvent.click(screen.getByText('Denumire'));
    expect(data[0].denumire).toBe('AAA Company');
  });
});

describe('CompanyCard Component', () => {
  it('should display company info', () => {
    render(<CompanyCard company={mockCompany} />);
    expect(screen.getByText(mockCompany.denumire)).toBeInTheDocument();
    expect(screen.getByText(mockCompany.cui)).toBeInTheDocument();
  });
});

describe('LeadScoreBadge Component', () => {
  it('should show hot for score > 80', () => {
    render(<LeadScoreBadge score={85} />);
    expect(screen.getByText('HOT')).toHaveClass('bg-red-500');
  });
  
  it('should show warm for score 50-80', () => {
    render(<LeadScoreBadge score={65} />);
    expect(screen.getByText('WARM')).toHaveClass('bg-orange-500');
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
