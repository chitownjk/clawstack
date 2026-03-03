import { NextRequest, NextResponse } from 'next/server'
import { createRealSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (optional for inquiries)
    const supabase = await createRealSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Parse request body
    const body = await request.json()
    const { name, email, company, message, service_type } = body as {
      name: string
      email: string
      company?: string
      message: string
      service_type: string
    }

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      )
    }

    // Get account if user is authenticated
    let accountId: string | null = null
    const adminClient = createAdminClient()

    if (user) {
      const { data: account } = await adminClient
        .from('accounts')
        .select('id')
        .eq('auth_uid', user.id)
        .single()
      
      accountId = account?.id || null
    }

    // Create inquiry record in service_purchases
    const { data: inquiry, error: insertError } = await adminClient
      .from('service_purchases')
      .insert({
        account_id: accountId,
        service_type: service_type || 'custom-work',
        amount_cents: 0,
        payment_status: 'inquiry',
        fulfillment_status: 'pending',
        fulfillment_notes: JSON.stringify({
          name,
          email,
          company: company || null,
          message,
          submitted_at: new Date().toISOString(),
        }),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create inquiry:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    // Send email notification to jay@solisinteractive.com
    // Using a simple fetch to the existing contact endpoint or direct email
    try {
      // Try to use existing email infrastructure
      const emailBody = `
New Custom Work Inquiry

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}

Message:
${message}

---
Inquiry ID: ${inquiry.id}
${accountId ? `Account ID: ${accountId}` : 'Not logged in'}
Submitted: ${new Date().toISOString()}
      `.trim()

      // If you have a configured email service, send here
      // For now, log it (in production, integrate with your email provider)
      console.log('📧 New inquiry to jay@solisinteractive.com:')
      console.log(emailBody)

      // Could also use AgentMail or another provider here
      // await fetch('your-email-api', { ... })

    } catch (emailError) {
      // Don't fail the request if email fails
      console.error('Failed to send email notification:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Your inquiry has been submitted. We\'ll be in touch within 24 hours.',
      inquiry_id: inquiry.id,
    })

  } catch (error) {
    console.error('Inquiry submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit inquiry' },
      { status: 500 }
    )
  }
}
