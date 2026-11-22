import os
import logging
import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger("email_service")

def format_due_date(due_date: Any) -> str:
    """Formats datetime or date object/string for readable display in emails."""
    if not due_date:
        return "Not specified"
    if isinstance(due_date, datetime.datetime):
        return due_date.strftime("%A, %B %d, %Y at %I:%M %p")
    if isinstance(due_date, datetime.date):
        return due_date.strftime("%A, %B %d, %Y")
    try:
        dt = datetime.datetime.fromisoformat(str(due_date).replace("Z", "+00:00"))
        return dt.strftime("%A, %B %d, %Y at %I:%M %p")
    except Exception:
        return str(due_date)

def build_task_assignment_html(
    student_name: str,
    task_title: str,
    task_description: str,
    due_date_str: str,
    mentor_name: str,
    mentor_email: Optional[str] = None,
    portal_url: str = "http://localhost:3000"
) -> str:
    """Generates a responsive modern HTML email template for task assignments."""
    mentor_contact_line = f'<p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Mentor Email: <a href="mailto:{mentor_email}" style="color: #38bdf8; text-decoration: none;">{mentor_email}</a></p>' if mentor_email else ""
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Task Assignment - Nexora Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); padding: 32px 36px; text-align: left;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase;">NEXORA</span>
                    <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; font-size: 10px; font-weight: 700; background-color: rgba(255,255,255,0.2); color: #ffffff; border-radius: 4px; letter-spacing: 1px;">PORTAL</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 10px;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">New Task Assignment</h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #e0f2fe;">Internship Action Required</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td style="padding: 36px 36px 24px 36px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Hello <strong style="color: #ffffff;">{student_name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Your academic mentor, <strong style="color: #38bdf8;">{mentor_name}</strong>, has assigned you a new internship task on the Nexora Portal. Please review the assignment details below:
              </p>

              <!-- Task Details Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 12px; border-left: 4px solid #0284c7; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <!-- Task Title -->
                    <div style="margin-bottom: 16px;">
                      <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Task Title</span>
                      <span style="display: block; font-size: 17px; font-weight: 700; color: #ffffff; margin-top: 4px;">{task_title}</span>
                    </div>

                    <!-- Due Date -->
                    <div style="margin-bottom: 16px; padding: 10px 14px; background-color: rgba(2, 132, 199, 0.1); border-radius: 8px; border: 1px solid rgba(2, 132, 199, 0.2);">
                      <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8;">Submission Deadline</span>
                      <span style="display: block; font-size: 14px; font-weight: 600; color: #f0f9ff; margin-top: 2px;">📅 {due_date_str}</span>
                    </div>

                    <!-- Description -->
                    <div>
                      <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px;">Task Description & Instructions</span>
                      <div style="font-size: 13px; line-height: 1.6; color: #cbd5e1; background-color: #0f172a; padding: 14px; border-radius: 8px; border: 1px solid #334155; white-space: pre-wrap;">{task_description}</div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Mentor Information Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(30, 41, 59, 0.5); border-radius: 10px; border: 1px solid #334155; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Assigned By Mentor</span>
                    <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #e2e8f0;">{mentor_name}</p>
                    {mentor_contact_line}
                  </td>
                </tr>
              </table>

              <!-- Action Call-To-Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="{portal_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4); text-align: center;">
                      Open Nexora Portal & Submit Task →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Next Steps Notice -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
                Please ensure you submit your task output and daily report on or before the specified deadline to maintain a high performance index.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b0f19; padding: 20px 36px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                © {datetime.datetime.utcnow().year} Nexora Technologies. All rights reserved.<br>
                Automated Internship Management System Notification.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

def send_task_assignment_email(
    to_email: str,
    student_name: str,
    task_title: str,
    task_description: str,
    due_date: Any,
    mentor_name: str,
    mentor_email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Sends an automated task assignment email to the student using Resend.
    Returns a dict with 'status': 'sent' | 'skipped' | 'failed' | 'simulated' and details.
    """
    if not to_email or "@" not in to_email:
        logger.warning(f"Skipping email delivery: invalid recipient address '{to_email}'")
        return {"status": "skipped", "reason": "invalid_email"}

    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        logger.info(
            f"RESEND_API_KEY not configured. Simulated task notification for '{to_email}' "
            f"(Task: '{task_title}', Mentor: '{mentor_name}')."
        )
        return {
            "status": "simulated",
            "message": "RESEND_API_KEY not configured in environment. Notification logged."
        }

    from_email = os.getenv("RESEND_FROM_EMAIL", "Nexora Portal <onboarding@resend.dev>").strip()
    due_date_str = format_due_date(due_date)
    html_content = build_task_assignment_html(
        student_name=student_name,
        task_title=task_title,
        task_description=task_description,
        due_date_str=due_date_str,
        mentor_name=mentor_name,
        mentor_email=mentor_email
    )

    subject = f"New Task Assigned: {task_title} | Nexora Internship"

    params: Dict[str, Any] = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "html": html_content,
    }

    if mentor_email and "@" in mentor_email:
        params["reply_to"] = mentor_email

    try:
        import resend
        resend.api_key = api_key
        response = resend.Emails.send(params)
        logger.info(f"Task assignment email sent successfully to {to_email} via Resend. ID: {response}")
        return {"status": "sent", "resend_id": getattr(response, "id", str(response))}
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via Resend: {e}")
        return {"status": "failed", "error": str(e)}
