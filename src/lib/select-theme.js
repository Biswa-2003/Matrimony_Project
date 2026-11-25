/**
 * Shared look for react-select dropdowns (searchable / multi-select) so they match the
 * native .form-select styling: Poppins, maroon text, gold hover, maroon selected, gold chips.
 */
const FONT = 'var(--font-poppins), "Segoe UI", system-ui, sans-serif';

export const selectTheme = (t) => ({
  ...t,
  borderRadius: 12,
  colors: { ...t.colors, primary: '#c9a24a', primary75: '#e8cf8e', primary50: '#f3e3c4', primary25: '#f6ead0', neutral20: '#e6d7bf', neutral30: '#c9a24a' },
});

export const selectStyles = {
  control: (b, s) => ({
    ...b,
    minHeight: 44,
    fontFamily: FONT,
    fontSize: '0.92rem',
    fontWeight: 500,
    background: s.isFocused ? '#fff' : 'linear-gradient(180deg, #fffdf9, #fbf4e8)',
    borderColor: s.isFocused ? '#c9a24a' : '#e6d7bf',
    boxShadow: s.isFocused ? '0 0 0 0.22rem rgba(201,162,74,.2)' : '0 1px 2px rgba(59,10,22,.04)',
    cursor: 'pointer',
    ':hover': { borderColor: '#c9a24a' },
  }),
  placeholder: (b) => ({ ...b, color: '#9b8a8f', fontWeight: 400 }),
  singleValue: (b) => ({ ...b, color: '#3b0a16' }),
  input: (b) => ({ ...b, color: '#3b0a16' }),
  valueContainer: (b) => ({ ...b, padding: '2px 10px', gap: 4 }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (b, s) => ({ ...b, color: '#9c7a2c', transform: s.selectProps.menuIsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease', ':hover': { color: '#7a1530' } }),
  clearIndicator: (b) => ({ ...b, color: '#9b8a8f', ':hover': { color: '#a3123a' } }),
  multiValue: (b) => ({ ...b, background: 'linear-gradient(135deg, #f6ead0, #f3e3c4)', border: '1px solid rgba(201,162,74,.5)', borderRadius: 20, paddingLeft: 4 }),
  multiValueLabel: (b) => ({ ...b, color: '#5a0f22', fontWeight: 600, fontSize: '0.8rem' }),
  multiValueRemove: (b) => ({ ...b, borderRadius: 20, color: '#7a1530', ':hover': { background: '#7a1530', color: '#fff' } }),
  menu: (b) => ({
    ...b,
    zIndex: 30,
    marginTop: 6,
    borderRadius: 16,
    overflow: 'hidden',
    border: '1px solid rgba(201,162,74,.35)',
    boxShadow: '0 24px 50px -20px rgba(28,3,11,.45)',
    background: '#fffdf9',
  }),
  menuList: (b) => ({ ...b, padding: 6 }),
  option: (b, s) => ({
    ...b,
    fontFamily: FONT,
    fontSize: '0.9rem',
    fontWeight: s.isSelected ? 600 : 500,
    borderRadius: 10,
    padding: '9px 12px',
    cursor: 'pointer',
    color: s.isSelected ? '#fff' : '#2a1a1f',
    background: s.isSelected ? 'linear-gradient(135deg, #7a1530, #5a0f22)' : s.isFocused ? '#f6ead0' : 'transparent',
    ':active': { background: '#efdcb0' },
  }),
  noOptionsMessage: (b) => ({ ...b, fontFamily: FONT, color: '#9b8a8f', fontSize: '0.85rem' }),
  groupHeading: (b) => ({ ...b, fontFamily: FONT, color: '#9c7a2c', letterSpacing: '.16em' }),
};
