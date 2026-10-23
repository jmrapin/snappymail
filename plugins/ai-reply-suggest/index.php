<?php

class AiReplySuggestPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'AI Reply Suggest',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.0.0',
		RELEASE  = '2026-08-02',
		REQUIRED = '2.38.0',
		CATEGORY = 'Tools',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Provides AI-powered reply suggestions for emails.';

	public function Init() : void
	{
		$this->UseLangs(true);

		// Admin settings
		$this->addJs('js/AIReplySuggestAdminSettings.js', true);
		$this->addTemplate('templates/AIReplySuggestAdminSettingsTab.html', true);

		// Frontend JS for compose window
		$this->addJs('js/ai-reply-suggest.js');

		// JSON handler for generating suggestions
		$this->addJsonHook('GenerateReplySuggestion', 'DoGenerateReplySuggestion');
	}

	/**
	 * Handle the AJAX request to generate a reply suggestion.
	 * Called from the compose window via rl.pluginRemoteRequest().
	 */
	public function DoGenerateReplySuggestion()
	{
		try {
			$sInstructions = $this->jsonParam('instructions', '');
			$sSubject = $this->jsonParam('subject', '');
			$sFrom = $this->jsonParam('from', '');
			$sTo = $this->jsonParam('to', '');
			$sBody = $this->jsonParam('body', '');

			\SnappyMail\Log::debug('AIReplySuggest', "Request: instructions={$sInstructions}, subject={$sSubject}, from={$sFrom}, to={$sTo}");

			if (empty($sInstructions)) {
				return $this->jsonResponse(__FUNCTION__, ['error' => 'No instructions provided']);
			}

			// Get plugin settings
			$sApiEndpoint = $this->Config()->Get('plugin', 'api_endpoint', '');
			$sApiKey = $this->Config()->Get('plugin', 'api_key', '');
			$sModel = $this->Config()->Get('plugin', 'model', '');
			$iMaxTokens = (int) $this->Config()->Get('plugin', 'max_tokens', 500);
			$fTemperature = (float) $this->Config()->Get('plugin', 'temperature', 0.7);

			\SnappyMail\Log::debug('AIReplySuggest', "Config: endpoint={$sApiEndpoint}, model={$sModel}, max_tokens={$iMaxTokens}");

			if (empty($sApiEndpoint)) {
				return $this->jsonResponse(__FUNCTION__, ['error' => 'AI API endpoint not configured']);
			}

			// Build the prompt
			$sPrompt = $this->buildPrompt($sSubject, $sFrom, $sTo, $sBody, $sInstructions);

			// Call the AI service
			$aResponse = $this->callAIService($sApiEndpoint, $sApiKey, $sModel, $sPrompt, $iMaxTokens, $fTemperature);

			\SnappyMail\Log::debug('AIReplySuggest', "AI response: " . json_encode($aResponse));

			if (isset($aResponse['error'])) {
				return $this->jsonResponse(__FUNCTION__, ['error' => $aResponse['error']]);
			}

			$sSuggestion = $aResponse['suggestion'] ?? '';
			if (empty($sSuggestion)) {
				return $this->jsonResponse(__FUNCTION__, ['error' => 'Empty response from AI service']);
			}

			return $this->jsonResponse(__FUNCTION__, ['suggestion' => $sSuggestion]);
		} catch (\Throwable $e) {
			\SnappyMail\Log::error('AIReplySuggest', 'Exception: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
			return $this->jsonResponse(__FUNCTION__, ['error' => 'Exception: ' . $e->getMessage()]);
		}
	}

	private function buildPrompt(string $sSubject, string $sFrom, string $sTo, string $sBody, string $sInstructions) : string
	{
		// Strip HTML tags from the email body for the prompt
		$sBodyText = \strip_tags($sBody);
		$sBodyText = \trim(\html_entity_decode($sBodyText));

		// Limit body length to avoid excessive token usage
		if (1024 < \strlen($sBodyText)) {
			$sBodyText = \substr($sBodyText, 0, 1024) . '...';
		}

		// Extract sender name for greeting
		$sSenderName = '';
		if (\preg_match('/^([^<]+)</', $sFrom, $m)) {
			$sSenderName = \trim($m[1]);
		} elseif (\preg_match('/^([^@]+)@/', $sFrom, $m)) {
			$sSenderName = $m[1];
		}

		$sPrompt = "You are an AI assistant that helps write email replies.\n";
		$sPrompt .= "Given the following email and user instructions, generate a suitable reply.\n";
		$sPrompt .= "Start with a professional greeting (e.g., 'Hi [Name],' or 'Dear [Name],').\n";
		$sPrompt .= "Do not include any explanations, just the reply text.\n\n";
		$sPrompt .= "Email Details:\n";
		$sPrompt .= "From: {$sFrom}\n";
		$sPrompt .= "To: {$sTo}\n";
		$sPrompt .= "Subject: {$sSubject}\n\n";
		$sPrompt .= "Email Body:\n{$sBodyText}\n\n";
		$sPrompt .= "User Instructions: {$sInstructions}\n\n";
		$sPrompt .= "Generated Reply:";

		return $sPrompt;
	}

	private function callAIService(string $sEndpoint, string $sApiKey, string $sModel, string $sPrompt, int $iMaxTokens, float $fTemperature) : array
	{
		$aPayload = [
			'model' => $sModel,
			'messages' => [
				['role' => 'user', 'content' => $sPrompt]
			],
			'max_tokens' => $iMaxTokens,
			'temperature' => $fTemperature
		];

		$sJson = \json_encode($aPayload);

		$aHeaders = [
			'Content-Type: application/json',
			'Content-Length: ' . \strlen($sJson)
		];
		if ($sApiKey) {
			$aHeaders[] = 'Authorization: Bearer ' . $sApiKey;
		}

		$ch = \curl_init();
		\curl_setopt_array($ch, [
			CURLOPT_URL => $sEndpoint,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_POST => true,
			CURLOPT_POSTFIELDS => $sJson,
			CURLOPT_HTTPHEADER => $aHeaders,
			// Reasoning models can take well over 100s to generate a full reply
			CURLOPT_CONNECTTIMEOUT => 10,
			CURLOPT_TIMEOUT => 180,
			CURLOPT_SSL_VERIFYPEER => true
		]);

		$sResponse = \curl_exec($ch);
		$iHttpCode = \curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$sError = \curl_error($ch);
		$iErrno = \curl_errno($ch);
		if (\PHP_VERSION_ID < 80500) {
			\curl_close($ch);
		}

		if ($sError) {
			return ['error' => 'cURL error (' . $iErrno . '): ' . $sError];
		}

		if (200 !== $iHttpCode) {
			return ['error' => 'HTTP ' . $iHttpCode . ': ' . $sResponse];
		}

		$aResult = \json_decode($sResponse, true);
		if (\JSON_ERROR_NONE !== \json_last_error()) {
			return ['error' => 'Invalid JSON response: ' . $sResponse];
		}

		// OpenAI-compatible response format
		$sSuggestion = '';
		if (isset($aResult['choices'][0]['message']['content'])) {
			$sSuggestion = $aResult['choices'][0]['message']['content'];
		} elseif (isset($aResult['choices'][0]['text'])) {
			$sSuggestion = $aResult['choices'][0]['text'];
		} elseif (isset($aResult['content'])) {
			$sSuggestion = $aResult['content'];
		}

		return ['suggestion' => \trim($sSuggestion)];
	}

	protected function configMapping() : array
	{
		return [
			\RainLoop\Plugins\Property::NewInstance('api_endpoint')
				->SetLabel('AI API Endpoint URL')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription('The URL of your AI service API endpoint (e.g., https://api.openai.com/v1/chat/completions)')
				->SetDefaultValue(''),

			\RainLoop\Plugins\Property::NewInstance('api_key')
				->SetLabel('API Key')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDescription('Your API key for authenticating with the AI service')
				->SetDefaultValue(''),

			\RainLoop\Plugins\Property::NewInstance('model')
				->SetLabel('Model')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription('The AI model to use (e.g., gpt-3.5-turbo, gpt-4, llama2)')
				->SetDefaultValue('gpt-3.5-turbo'),

			\RainLoop\Plugins\Property::NewInstance('max_tokens')
				->SetLabel('Max Tokens')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDescription('Maximum number of tokens for the generated reply')
				->SetDefaultValue(500),

			\RainLoop\Plugins\Property::NewInstance('temperature')
				->SetLabel('Temperature')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription('Creativity of the response (0.0 = focused, 1.0 = creative)')
				->SetDefaultValue('0.7'),
		];
	}
}