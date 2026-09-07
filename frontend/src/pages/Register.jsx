import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { register } from "../features/auth/authSlice";

const steps = [
  { title: "What's your email?", fields: [["email", "Email", "email"]] },
  {
    title: "What's your name?",
    fields: [
      ["firstName", "First name", "text"],
      ["lastName", "Last name", "text"],
    ],
  },
  {
    title: "What's your date of birth?",
    fields: [["dateOfBirth", "Date of birth", "date"]],
  },
  {
    title: "How would you like to be addressed?",
    fields: [["gender", "", "gender"]],
  },
  {
    title: "Please verify your mobile number",
    fields: [["phone", "India (+91) Mobile phone", "tel"]],
  },
  {
    title: "Define your password",
    fields: [["password", "Password", "password"]],
  },
];

const countries = [
  ["IN", "India", "+91"],
  ["US", "United States", "+1"],
  ["GB", "United Kingdom", "+44"],
  ["CA", "Canada", "+1"],
  ["AU", "Australia", "+61"],
  ["AE", "United Arab Emirates", "+971"],
  ["SA", "Saudi Arabia", "+966"],
  ["SG", "Singapore", "+65"],
  ["MY", "Malaysia", "+60"],
  ["TH", "Thailand", "+66"],
  ["NP", "Nepal", "+977"],
  ["BD", "Bangladesh", "+880"],
  ["LK", "Sri Lanka", "+94"],
  ["PK", "Pakistan", "+92"],
  ["CN", "China", "+86"],
  ["JP", "Japan", "+81"],
  ["KR", "South Korea", "+82"],
  ["ID", "Indonesia", "+62"],
  ["PH", "Philippines", "+63"],
  ["VN", "Vietnam", "+84"],
  ["DE", "Germany", "+49"],
  ["FR", "France", "+33"],
  ["IT", "Italy", "+39"],
  ["ES", "Spain", "+34"],
  ["PT", "Portugal", "+351"],
  ["NL", "Netherlands", "+31"],
  ["BE", "Belgium", "+32"],
  ["CH", "Switzerland", "+41"],
  ["AT", "Austria", "+43"],
  ["IE", "Ireland", "+353"],
  ["SE", "Sweden", "+46"],
  ["NO", "Norway", "+47"],
  ["DK", "Denmark", "+45"],
  ["FI", "Finland", "+358"],
  ["PL", "Poland", "+48"],
  ["CZ", "Czech Republic", "+420"],
  ["GR", "Greece", "+30"],
  ["RO", "Romania", "+40"],
  ["HU", "Hungary", "+36"],
  ["UA", "Ukraine", "+380"],
  ["TR", "Turkey", "+90"],
  ["IL", "Israel", "+972"],
  ["EG", "Egypt", "+20"],
  ["ZA", "South Africa", "+27"],
  ["NG", "Nigeria", "+234"],
  ["KE", "Kenya", "+254"],
  ["GH", "Ghana", "+233"],
  ["MA", "Morocco", "+212"],
  ["TZ", "Tanzania", "+255"],
  ["UG", "Uganda", "+256"],
  ["BR", "Brazil", "+55"],
  ["MX", "Mexico", "+52"],
  ["AR", "Argentina", "+54"],
  ["CL", "Chile", "+56"],
  ["CO", "Colombia", "+57"],
  ["PE", "Peru", "+51"],
  ["VE", "Venezuela", "+58"],
  ["UY", "Uruguay", "+598"],
  ["NZ", "New Zealand", "+64"],
  ["RU", "Russia", "+7"],
  ["KZ", "Kazakhstan", "+7"],
  ["AF", "Afghanistan", "+93"],
  ["IR", "Iran", "+98"],
  ["IQ", "Iraq", "+964"],
  ["JO", "Jordan", "+962"],
  ["LB", "Lebanon", "+961"],
  ["QA", "Qatar", "+974"],
  ["KW", "Kuwait", "+965"],
  ["OM", "Oman", "+968"],
  ["BH", "Bahrain", "+973"],
  ["IS", "Iceland", "+354"],
  ["HR", "Croatia", "+385"],
  ["RS", "Serbia", "+381"],
  ["BG", "Bulgaria", "+359"],
  ["SK", "Slovakia", "+421"],
  ["SI", "Slovenia", "+386"],
  ["LT", "Lithuania", "+370"],
  ["LV", "Latvia", "+371"],
  ["EE", "Estonia", "+372"],
  ["BY", "Belarus", "+375"],
  ["GE", "Georgia", "+995"],
  ["AM", "Armenia", "+374"],
  ["AZ", "Azerbaijan", "+994"],
  ["UZ", "Uzbekistan", "+998"],
  ["MN", "Mongolia", "+976"],
  ["KH", "Cambodia", "+855"],
  ["LA", "Laos", "+856"],
  ["MM", "Myanmar", "+95"],
  ["TW", "Taiwan", "+886"],
  ["HK", "Hong Kong", "+852"],
  ["MO", "Macao", "+853"],
  ["BN", "Brunei", "+673"],
  ["FJ", "Fiji", "+679"],
  ["PG", "Papua New Guinea", "+675"],
  ["ET", "Ethiopia", "+251"],
  ["SD", "Sudan", "+249"],
  ["SN", "Senegal", "+221"],
  ["CI", "Cote d’Ivoire", "+225"],
  ["CM", "Cameroon", "+237"],
  ["ZW", "Zimbabwe", "+263"],
  ["ZM", "Zambia", "+260"],
  ["MZ", "Mozambique", "+258"],
  ["AO", "Angola", "+244"],
  ["NA", "Namibia", "+264"],
  ["BW", "Botswana", "+267"],
  ["MU", "Mauritius", "+230"],
  ["SC", "Seychelles", "+248"],
  ["MG", "Madagascar", "+261"],
  ["JM", "Jamaica", "+1"],
  ["TT", "Trinidad and Tobago", "+1"],
  ["BB", "Barbados", "+1"],
  ["BS", "Bahamas", "+1"],
  ["CR", "Costa Rica", "+506"],
  ["PA", "Panama", "+507"],
  ["GT", "Guatemala", "+502"],
  ["HN", "Honduras", "+504"],
  ["DO", "Dominican Republic", "+1"],
];

function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(countries[0]);
  const [values, setValues] = useState({
    gender: "",
    email: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    password: "",
  });
  const current = steps[step];
  const update = (key, value) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const advance = async (event) => {
    event.preventDefault();
    if (current.fields.some(([key]) => !values[key])) return;
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    const result = await dispatch(
      register({
        ...values,
        phone: `${country[2]}${values.phone.replace(/\D/g, "")}`,
      }),
    );
    if (register.fulfilled.match(result)) navigate("/");
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <a href="/" className="brand">
          <span className="brand-mark">
            <i /> <b />
          </span>
          <span>CarPooling</span>
        </a>
        <a className="auth-home-link" href="/login">
          Already a member? Log in
        </a>
      </header>
      <main className="auth-main">
        <div className="register-form-wrap">
          <p className="step-count">
            STEP {step + 1} OF {steps.length}
          </p>
          <h1>{current.title}</h1>
          {step === 5 && (
            <p className="auth-intro">
              It must have at least 8 characters, 1 letter, 1 number and 1
              special character.
            </p>
          )}
          <form onSubmit={advance} className="auth-form register-form">
            {current.fields.map(([key, placeholder, type]) =>
              type === "gender" ? (
                <div className="gender-list" key={key}>
                  {[
                    ["female", "Miss / Madam"],
                    ["male", "Sir"],
                    ["prefer-not-to-say", "I'd rather not say"],
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      className={values.gender === value ? "selected" : ""}
                      key={value}
                      onClick={() => update(key, value)}
                    >
                      {label}
                      <span>›</span>
                    </button>
                  ))}
                </div>
              ) : type === "tel" ? (
                <div className="phone-input" key={key}>
                  <label className="country-select">
                    <span>Country</span>
                    <select
                      value={country[0]}
                      onChange={(event) =>
                        setCountry(
                          countries.find(
                            (item) => item[0] === event.target.value,
                          ) || countries[0],
                        )
                      }
                    >
                      {countries.map(([code, name, dialCode], index) => (
                        <option
                          value={code}
                          key={`${code}-${index}`}
                        >
                          {name} ({dialCode})
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="dial-code">{country[2]}</span>
                  <input
                    autoFocus
                    type="tel"
                    value={values[key]}
                    onChange={(event) =>
                      update(key, event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Mobile phone"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                  />
                </div>
              ) : (
                <input
                  autoFocus={key === current.fields[0][0]}
                  key={key}
                  type={type}
                  value={values[key]}
                  onChange={(event) => update(key, event.target.value)}
                  placeholder={placeholder}
                  required
                />
              ),
            )}
            {(step === 0 || step === 4) && (
              <label className="marketing-row">
                <input type="checkbox" />{" "}
                <span>
                  I don't want to receive commercial offers or recommendations
                  from CarPooling by{" "}
                  {step === 0 ? "email" : "messages or phone calls"}.
                </span>
              </label>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="back-link"
                onClick={() => (step ? setStep(step - 1) : navigate("/login"))}
              >
                ← Back
              </button>
              <button
                className="auth-submit"
                disabled={
                  loading || current.fields.some(([key]) => !values[key])
                }
              >
                {loading
                  ? "Creating account..."
                  : step === steps.length - 1
                    ? "Create account"
                    : "Continue"}{" "}
                <span>→</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Register;
