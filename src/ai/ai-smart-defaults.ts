// src/ai/ai-smart-defaults.ts
'use server';

/**
 * @fileOverview AI-powered smart defaults for CSV import.
 *
 * This file defines a Genkit flow that leverages AI to analyze a user's import history
 * and suggest optimal column mappings and settings for new CSV imports.
 *
 * - `suggestSmartDefaults` - A function that suggests smart defaults based on import history and a sample CSV header.
 * - `SmartDefaultsInput` - The input type for the `suggestSmartDefaults` function.
 * - `SmartDefaultsOutput` - The return type for the `suggestSmartDefaults` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartDefaultsInputSchema = z.object({
  importHistory: z.array(
    z.object({
      columnMappings: z.object({
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        altitude: z.string().optional(),
      }).optional(),
      delimiter: z.string().optional(),
    })
  ).describe('A list of previous import settings.'),
  csvHeader: z.array(z.string()).describe('The header row of the CSV file to import.'),
});
export type SmartDefaultsInput = z.infer<typeof SmartDefaultsInputSchema>;

const SmartDefaultsOutputSchema = z.object({
  suggestedColumnMappings: z.object({
    latitude: z.string().optional().describe('Suggested column for latitude.'),
    longitude: z.string().optional().describe('Suggested column for longitude.'),
    altitude: z.string().optional().describe('Suggested column for altitude.'),
  }).describe('Suggested column mappings based on history and header.'),
  suggestedDelimiter: z.string().optional().describe('Suggested delimiter based on import history.'),
});
export type SmartDefaultsOutput = z.infer<typeof SmartDefaultsOutputSchema>;

export async function suggestSmartDefaults(input: SmartDefaultsInput): Promise<SmartDefaultsOutput> {
  return smartDefaultsFlow(input);
}

const smartDefaultsPrompt = ai.definePrompt({
  name: 'smartDefaultsPrompt',
  input: {schema: SmartDefaultsInputSchema},
  output: {schema: SmartDefaultsOutputSchema},
  prompt: `You are an expert at predicting CSV import settings based on user history.

  Here's the user's import history:
  {{#if importHistory}}
  {{#each importHistory}}
  - Column Mappings: Latitude={{this.columnMappings.latitude}}, Longitude={{this.columnMappings.longitude}}, Altitude={{this.columnMappings.altitude}}, Delimiter={{this.delimiter}}
  {{/each}}
  {{else}}
  No import history available.
  {{/if}}

  Here's the header row of the CSV file to import:
  {{#each csvHeader}}{{#if @first}}{{{this}}}{{else}}, {{{this}}}{{/if}}{{/each}}

  Based on this information, suggest the most likely column mappings (latitude, longitude, altitude) and delimiter for the new CSV file.
  Ensure that the output is a valid JSON object.
  `,
});

const smartDefaultsFlow = ai.defineFlow(
  {
    name: 'smartDefaultsFlow',
    inputSchema: SmartDefaultsInputSchema,
    outputSchema: SmartDefaultsOutputSchema,
  },
  async input => {
    const {output} = await smartDefaultsPrompt(input);
    return output!;
  }
);
