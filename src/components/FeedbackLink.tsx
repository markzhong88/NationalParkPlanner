export const FEEDBACK_EMAIL = "mark.zhong@greenlake.co";

export const FEEDBACK_MAILTO =
  `mailto:${FEEDBACK_EMAIL}?subject=` + encodeURIComponent("Rimfold feedback");

export function FeedbackLink({ className }: { className?: string }) {
  return (
    <a href={FEEDBACK_MAILTO} title={FEEDBACK_EMAIL} className={className}>
      Send feedback
    </a>
  );
}
