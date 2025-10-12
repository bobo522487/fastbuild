import { vi } from "vitest";

// Nodemailer mock configuration
export const createMockNodemailer = () => {
	const sentEmails: any[] = [];

	const mockTransport = {
		sendMail: vi.fn().mockImplementation(async (mailOptions: any) => {
			const email = {
				id: `email_${Date.now()}`,
				to: mailOptions.to,
				from: mailOptions.from,
				subject: mailOptions.subject,
				text: mailOptions.text,
				html: mailOptions.html,
				sentAt: new Date(),
				...mailOptions,
			};
			sentEmails.push(email);
			return { messageId: email.id };
		}),

		verify: vi.fn().mockResolvedValue(true),
	};

	const mockCreateTransport = vi.fn().mockReturnValue(mockTransport);

	// Helper functions
	const getEmails = () => sentEmails;
	const resetEmails = () => {
		sentEmails.length = 0;
	};
	const getLastEmail = () => sentEmails[sentEmails.length - 1] || null;
	const getEmailsTo = (recipient: string) =>
		sentEmails.filter((email) => email.to === recipient);

	return {
		createTransport: mockCreateTransport,
		getTestTransport: () => mockTransport,
		// Helper functions
		getEmails,
		resetEmails,
		getLastEmail,
		getEmailsTo,
		mockSendSuccess: () => {
			mockTransport.sendMail.mockResolvedValue({
				messageId: "test-message-id",
			});
		},
		mockSendFailure: (error: Error) => {
			mockTransport.sendMail.mockRejectedValue(error);
		},
	};
};

export const { createTransport, getTestTransport, getEmails, resetEmails } =
	createMockNodemailer();
