import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { getPublicSettings, submitLead } from "@/lib/funnelApi";
import {
  buildLeadSubmissionPayload,
  defaultPublicSettings,
  emptyLeadSurveyForm,
  shouldAutoOpenPopup,
  type LeadSurveyForm,
  type PublicSettings,
} from "@/lib/recruitmentFunnel";
import { z } from "zod";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Flame, Instagram, Shield, Users, Youtube } from "lucide-react";
import rfsLogo from "@/assets/rfs-logo.png";
import photoHelicopterGroup from "@/assets/rfs-helicopter-group.jpeg";
import photoHelicopterBambi from "@/assets/rfs-helicopter.jpeg";
import photoDiscussion from "@/assets/rfs-discussion.jpeg";
import photoOutdoorGroup from "@/assets/rfs-outdoor-group.jpeg";

const galleryPhotos = [
  { src: photoHelicopterGroup, alt: "Volunteers in front of an RFS helicopter" },
  { src: photoHelicopterBambi, alt: "Briefing beside an RFS helicopter with a Bambi Bucket" },
  { src: photoDiscussion, alt: "RFS volunteers laughing during a panel discussion" },
  { src: photoOutdoorGroup, alt: "RFS volunteer group portrait by the river" },
];

const stepLabels = ["Contact", "Interest", "Send guide"];

const Index = () => {
  const [settings, setSettings] = useState<PublicSettings>(defaultPublicSettings);
  const [open, setOpen] = useState(false);
  const [surveyStep, setSurveyStep] = useState(0);
  const [form, setForm] = useState<LeadSurveyForm>(emptyLeadSurveyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const progressLabel = useMemo(() => `${surveyStep + 1} of ${stepLabels.length}`, [surveyStep]);

  useEffect(() => {
    let mounted = true;

    getPublicSettings().then((loadedSettings) => {
      if (!mounted) return;
      setSettings(loadedSettings);

      if (shouldAutoOpenPopup(loadedSettings, window.sessionStorage)) {
        const delayMs = Math.max(0, loadedSettings.popup_delay_seconds) * 1000;
        window.setTimeout(() => {
          if (!mounted || window.sessionStorage.getItem("joinrfs_popup_seen") === "true") return;
          setOpen(true);
          window.sessionStorage.setItem("joinrfs_popup_seen", "true");
          trackEvent("popup_auto_opened", { delay_seconds: loadedSettings.popup_delay_seconds });
        }, delayMs);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const openSurveyFromCta = () => {
    setOpen(true);
    setSubmittedMessage(null);
    window.sessionStorage.setItem("joinrfs_popup_seen", "true");
    trackEvent("become_firefighter_clicked");
    trackEvent("survey_started", { source: "cta" });
  };

  const closeSurvey = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen && !submittedMessage) {
      window.sessionStorage.setItem("joinrfs_popup_seen", "true");
      trackEvent("popup_closed", { step: surveyStep + 1 });
    }
  };

  const updateForm = <K extends keyof LeadSurveyForm>(key: K, value: LeadSurveyForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const nextStep = () => {
    const error = validateCurrentStep(form, surveyStep);
    if (error) {
      toast({ title: "Check your details", description: error, variant: "destructive" });
      return;
    }

    setSurveyStep((step) => Math.min(step + 1, stepLabels.length - 1));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const currentStepError = validateCurrentStep(form, 2);
      if (currentStepError) {
        throw new Error(currentStepError);
      }

      const payload = buildLeadSubmissionPayload(form, new URLSearchParams(window.location.search));
      setSubmitting(true);
      trackEvent("survey_submitted");

      const response = await submitLead(payload);
      if (!response.ok) {
        throw new Error(response.error ?? "Submission failed.");
      }

      if (response.package_email_sent) {
        trackEvent("package_email_sent");
      } else {
        trackEvent("package_email_failed");
      }

      setSubmittedMessage(response.message ?? settings.success_message);
      setForm(emptyLeadSurveyForm);
      setSurveyStep(0);
      toast({
        title: response.package_email_sent ? "Guide sent" : "Details saved",
        description: response.message ?? settings.success_message,
      });
    } catch (error) {
      const message =
        error instanceof z.ZodError ? error.issues[0]?.message ?? "Check your details" : error instanceof Error ? error.message : "Please try again.";
      trackEvent("survey_submit_error", { message });
      toast({ title: "Something went wrong", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen rfs-sky relative overflow-hidden">
      <div className="absolute top-[10%] left-[5%] w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 glow-yellow animate-drift pointer-events-none" />
      <div className="absolute top-[30%] right-[2%] w-56 h-56 sm:w-80 sm:h-80 md:w-[28rem] md:h-[28rem] glow-orange animate-drift pointer-events-none" style={{ animationDelay: "2s" }} />
      <div className="absolute bottom-[15%] left-[10%] w-52 h-52 sm:w-72 sm:h-72 md:w-[24rem] md:h-[24rem] glow-red animate-drift pointer-events-none" style={{ animationDelay: "5s" }} />

      <header className="relative z-20 flex items-center justify-between px-4 sm:px-5 md:px-16 py-3 md:py-6">
        <div className="flex items-center gap-2 md:gap-3">
          <img src={rfsLogo} alt="NSW Rural Fire Service" className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 object-contain" />
          <span className="text-sm md:text-lg tracking-widest uppercase font-bold text-rfs-yellow">Join RFS</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wider text-foreground/80">
          <a href="#about" className="hover:text-rfs-yellow transition-colors duration-300">About</a>
          <a href="#why" className="hover:text-rfs-yellow transition-colors duration-300">Why Join</a>
          <a href="#contact" className="hover:text-rfs-yellow transition-colors duration-300">Contact</a>
        </nav>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-[5px] p-2 -mr-2" aria-label="Toggle menu">
          <span className={`block w-6 h-[2px] bg-foreground transition-transform duration-300 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
          <span className={`block w-6 h-[2px] bg-foreground transition-opacity duration-300 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-[2px] bg-foreground transition-transform duration-300 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
        </button>
      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-10 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center gap-8">
          <a href="#about" onClick={() => setMenuOpen(false)} className="text-2xl font-bold uppercase tracking-widest text-foreground hover:text-rfs-yellow transition-colors">About</a>
          <a href="#why" onClick={() => setMenuOpen(false)} className="text-2xl font-bold uppercase tracking-widest text-foreground hover:text-rfs-yellow transition-colors">Why Join</a>
          <a href="#contact" onClick={() => setMenuOpen(false)} className="text-2xl font-bold uppercase tracking-widest text-foreground hover:text-rfs-yellow transition-colors">Contact</a>
        </div>
      )}

      <section className="relative z-10 flex flex-col items-center justify-center px-4 sm:px-5 pt-6 sm:pt-8 md:pt-12 pb-16 sm:pb-20 md:pb-28 text-center max-w-4xl mx-auto animate-fade-up">
        <p className="text-[10px] sm:text-xs md:text-base uppercase tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] text-rfs-orange mb-3 sm:mb-4 md:mb-6 font-semibold">
          NSW Rural Fire Service
        </p>

        <h1 className="text-4xl sm:text-5xl md:text-8xl lg:text-9xl leading-[0.9] mb-4 sm:mb-5 md:mb-6">
          <span className="text-foreground">{settings.hero_headline.split(" ").slice(0, -1).join(" ") || "BE THE"}</span>
          <br />
          <span className="text-rfs-yellow">{settings.hero_headline.split(" ").slice(-1).join(" ") || "DIFFERENCE"}</span>
        </h1>

        <p className="text-sm sm:text-base md:text-xl text-foreground/80 font-normal max-w-xl sm:max-w-2xl mb-8 sm:mb-10 md:mb-14 leading-relaxed px-2 sm:px-0">
          {settings.hero_subheadline}
        </p>

        <Button
          onClick={openSurveyFromCta}
          className="h-14 sm:h-14 md:h-16 px-8 sm:px-10 md:px-14 text-base md:text-lg font-bold tracking-[0.15em] uppercase rounded-full bg-rfs-yellow text-background hover:bg-rfs-orange transition-all duration-300 shadow-[0_0_40px_hsl(var(--rfs-yellow)/0.35)] w-full max-w-xs sm:max-w-sm"
        >
          {settings.cta_text}
        </Button>

        <p className="mt-6 sm:mt-8 md:mt-10 text-[10px] sm:text-xs md:text-sm text-foreground/60 font-normal tracking-wide">
          Guide and support funnel only. Official joining steps are completed through NSW RFS channels.
        </p>
      </section>

      <section id="why" className="relative z-10 px-4 sm:px-5 pb-16 sm:pb-20 md:pb-32 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-14">
          {[
            { title: "TRAIN", body: "Learn real skills from firetrucks to helicopter operations with expert mentors at your side.", icon: Flame, color: "text-rfs-yellow" },
            { title: "SERVE", body: "Stand with your community when it matters most. Fight fires, respond to floods, save lives.", icon: Shield, color: "text-rfs-orange" },
            { title: "BELONG", body: "Find your crew. Build friendships forged in shared purpose that last a lifetime.", icon: Users, color: "text-rfs-red" },
          ].map((pillar, i) => (
            <div key={pillar.title} className="text-center animate-fade-up bg-card/40 backdrop-blur-sm rounded-2xl p-5 sm:p-6 md:p-8 border border-border/30" style={{ animationDelay: `${i * 0.15}s` }}>
              <div className={`mx-auto mb-3 sm:mb-4 md:mb-5 flex items-center justify-center ${pillar.color}`}>
                <pillar.icon size={32} className="sm:w-9 sm:h-9 md:w-10 md:h-10" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-5xl mb-2 sm:mb-3 md:mb-4 tracking-wider">{pillar.title}</h2>
              <p className="text-foreground/70 font-normal leading-relaxed text-sm md:text-base">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-4 sm:px-5 pb-16 sm:pb-20 md:pb-32 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl md:text-6xl text-center tracking-wider mb-8 sm:mb-10 md:mb-14">
          <span className="text-rfs-yellow">REAL</span> <span className="text-foreground">CREWS</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {galleryPhotos.map((p) => (
            <div key={p.src} className="overflow-hidden rounded-xl sm:rounded-2xl border border-border/30 aspect-[4/3] bg-card/40">
              <img src={p.src} alt={p.alt} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="relative z-10 px-4 sm:px-5 pb-16 sm:pb-20 md:pb-32 max-w-3xl mx-auto text-center">
        <p className="text-xl sm:text-2xl md:text-4xl font-normal italic text-foreground/90 leading-relaxed">
          "Courage isn't the absence of fear. It's showing up anyway."
        </p>
      </section>

      <section className="relative z-10 px-4 sm:px-5 pb-8 sm:pb-10 md:pb-16 max-w-4xl mx-auto text-center">
        <p className="text-sm sm:text-base md:text-xl text-foreground/80 font-normal max-w-xl sm:max-w-2xl mb-6 sm:mb-8 md:mb-10 leading-relaxed px-2 sm:px-0">
          Ready to understand the path? Get the How to Join Package and an operator can follow up if you want help.
        </p>
        <Button
          onClick={openSurveyFromCta}
          className="h-14 sm:h-14 md:h-16 px-8 sm:px-10 md:px-14 text-base md:text-lg font-bold tracking-[0.15em] uppercase rounded-full bg-rfs-yellow text-background hover:bg-rfs-orange transition-all duration-300 shadow-[0_0_40px_hsl(var(--rfs-yellow)/0.35)] w-full max-w-xs sm:max-w-sm"
        >
          Get the How to Join Package
        </Button>
      </section>

      <footer id="contact" className="relative z-10 px-4 sm:px-6 py-10 sm:py-12 border-t border-border/40 text-center">
        <p className="text-xs sm:text-sm text-foreground/60 font-normal mb-5 sm:mb-6">
          A volunteer-led guide and support funnel. Official NSW RFS application steps happen through official channels.
        </p>
        <div className="flex items-center justify-center gap-5 sm:gap-6 mb-5 sm:mb-6">
          <a href="https://www.youtube.com/@aussiefarmertom" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-rfs-yellow transition-colors duration-300 p-1" aria-label="YouTube">
            <Youtube size={24} className="sm:w-[22px] sm:h-[22px]" />
          </a>
          <a href="https://www.instagram.com/aussiefarmertom/" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-rfs-yellow transition-colors duration-300 p-1" aria-label="Instagram">
            <Instagram size={24} className="sm:w-[22px] sm:h-[22px]" />
          </a>
        </div>
        <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs text-foreground/50 font-normal tracking-wide">
          <span>joinrfs.com.au</span>
          <span>|</span>
          <span>joinnswrfs.com.au</span>
        </div>
      </footer>

      <Dialog open={open} onOpenChange={closeSurvey}>
        <DialogContent className="sm:max-w-xl w-[94vw] max-h-[88vh] overflow-y-auto rounded-2xl border-border/50 p-5 sm:p-6">
          {submittedMessage ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-rfs-yellow" />
              <DialogTitle className="text-3xl tracking-wider">Guide Requested</DialogTitle>
              <DialogDescription className="mt-3 text-base text-foreground/75">{submittedMessage}</DialogDescription>
              <p className="mt-5 text-sm text-foreground/60">
                This is not the official application portal. The package points you toward the official NSW RFS joining steps.
              </p>
              <Button className="mt-7 rounded-full bg-rfs-yellow text-background hover:bg-rfs-orange" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader className="mb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl sm:text-3xl tracking-wider">{settings.popup_title}</DialogTitle>
                    <DialogDescription className="font-normal text-sm sm:text-base">{settings.popup_description}</DialogDescription>
                  </div>
                  <span className="shrink-0 rounded-full border border-border/60 px-3 py-1 text-xs text-foreground/60">{progressLabel}</span>
                </div>
              </DialogHeader>

              <div className="mb-5 grid grid-cols-3 gap-2">
                {stepLabels.map((label, index) => (
                  <div key={label} className={`h-1.5 rounded-full ${index <= surveyStep ? "bg-rfs-yellow" : "bg-muted"}`} />
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {surveyStep === 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name" id="first_name">
                      <Input id="first_name" value={form.first_name} onChange={(e) => updateForm("first_name", e.target.value)} autoComplete="given-name" />
                    </Field>
                    <Field label="Last name" id="last_name">
                      <Input id="last_name" value={form.last_name} onChange={(e) => updateForm("last_name", e.target.value)} autoComplete="family-name" />
                    </Field>
                    <Field label="Email" id="email">
                      <Input id="email" type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} autoComplete="email" />
                    </Field>
                    <Field label="Phone" id="phone">
                      <Input id="phone" type="tel" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} autoComplete="tel" placeholder="Optional" />
                    </Field>
                    <Field label="Suburb" id="suburb">
                      <Input id="suburb" value={form.suburb} onChange={(e) => updateForm("suburb", e.target.value)} autoComplete="address-level2" />
                    </Field>
                    <Field label="Postcode" id="postcode">
                      <Input id="postcode" value={form.postcode} onChange={(e) => updateForm("postcode", e.target.value)} inputMode="numeric" autoComplete="postal-code" />
                    </Field>
                  </div>
                )}

                {surveyStep === 1 && (
                  <div className="grid gap-4">
                    <Field label="Age range" id="age_range">
                      <Select value={form.age_range} onValueChange={(value) => updateForm("age_range", value)}>
                        <SelectTrigger id="age_range"><SelectValue placeholder="Choose an age range" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12-15">12-15</SelectItem>
                          <SelectItem value="16-17">16-17</SelectItem>
                          <SelectItem value="18-24">18-24</SelectItem>
                          <SelectItem value="25-34">25-34</SelectItem>
                          <SelectItem value="35-49">35-49</SelectItem>
                          <SelectItem value="50+">50+</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="What are you interested in?" id="interest_type">
                      <Select value={form.interest_type} onValueChange={(value) => updateForm("interest_type", value)}>
                        <SelectTrigger id="interest_type"><SelectValue placeholder="Choose one" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="volunteering">Volunteering as a firefighter</SelectItem>
                          <SelectItem value="cadets">Cadets or youth pathway</SelectItem>
                          <SelectItem value="support">Support roles and community work</SelectItem>
                          <SelectItem value="unsure">Not sure yet</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="When would you like to start?" id="joining_timeline">
                      <Select value={form.joining_timeline} onValueChange={(value) => updateForm("joining_timeline", value)}>
                        <SelectTrigger id="joining_timeline"><SelectValue placeholder="Choose a timeline" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="now">Now or as soon as possible</SelectItem>
                          <SelectItem value="soon">In the next few months</SelectItem>
                          <SelectItem value="later">Later this year</SelectItem>
                          <SelectItem value="researching">Just researching</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}

                {surveyStep === 2 && (
                  <div className="grid gap-4">
                    <Field label="Preferred contact method" id="preferred_contact_method">
                      <Select value={form.preferred_contact_method} onValueChange={(value) => updateForm("preferred_contact_method", value)}>
                        <SelectTrigger id="preferred_contact_method"><SelectValue placeholder="Choose one" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone call</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="any">Any is fine</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <label className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4 text-sm leading-relaxed">
                      <Checkbox checked={form.consent_email} onCheckedChange={(checked) => updateForm("consent_email", checked === true)} />
                      <span>I agree to receive the How to Join Package by email and understand my details may be used for follow-up.</span>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-4 text-sm leading-relaxed">
                      <Checkbox checked={form.consent_sms} onCheckedChange={(checked) => updateForm("consent_sms", checked === true)} />
                      <span>Optional: I am happy to receive SMS follow-up in future if this service is enabled.</span>
                    </label>
                    <p className="text-xs text-foreground/55">
                      This guide supports your next step. Official application steps are completed through NSW RFS channels.
                    </p>
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => (surveyStep === 0 ? closeSurvey(false) : setSurveyStep((step) => step - 1))}>
                    {surveyStep === 0 ? "Not now" : "Back"}
                  </Button>
                  {surveyStep < stepLabels.length - 1 ? (
                    <Button type="button" onClick={nextStep} className="rounded-full bg-rfs-yellow text-background hover:bg-rfs-orange">
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" disabled={submitting} className="rounded-full bg-rfs-yellow text-background hover:bg-rfs-orange">
                      {submitting ? "Sending..." : "Send me the guide"}
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
};

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-semibold text-sm">
        {label}
      </Label>
      {children}
    </div>
  );
}

function validateCurrentStep(form: LeadSurveyForm, step: number): string | null {
  try {
    if (step === 0) {
      z.object({
        first_name: z.string().trim().min(1, "First name is required"),
        email: z.string().trim().email("Enter a valid email"),
        suburb: z.string().trim().min(1, "Suburb is required"),
        postcode: z.string().trim().min(3, "Postcode is required"),
      }).parse(form);
    }

    if (step === 1) {
      z.object({
        age_range: z.string().min(1, "Choose an age range"),
        interest_type: z.string().min(1, "Choose what you are interested in"),
        joining_timeline: z.string().min(1, "Choose a joining timeline"),
      }).parse(form);
    }

    if (step === 2) {
      z.object({
        preferred_contact_method: z.string().min(1, "Choose a preferred contact method"),
        consent_email: z.literal(true, {
          errorMap: () => ({ message: "Email consent is required so we can send the guide" }),
        }),
      }).parse(form);
    }

    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message ?? "Check your details";
    }
    return "Check your details";
  }
}

export default Index;
