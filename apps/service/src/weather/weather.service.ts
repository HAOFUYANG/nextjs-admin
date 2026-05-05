import { Injectable } from '@nestjs/common';

export type WeatherSnapshot = {
  city: string;
  tempC: number;
  text: string;
  windKph: number;
  humidity: number;
  icon: string;
  localtime: string;
};

@Injectable()
export class WeatherService {
  private readonly endpoint = 'https://api.weatherapi.com/v1/current.json';

  async getWeather(city = 'Shanghai'): Promise<WeatherSnapshot> {
    const apiKey = process.env.WEATHER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('WEATHER_API_KEY is required');
    }

    const search = new URLSearchParams({
      key: apiKey,
      q: city,
      aqi: 'no',
    });
    const response = await fetch(`${this.endpoint}?${search.toString()}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `weather request failed: ${response.status} ${errorText}`,
      );
    }
    const payload = await response.json();
    return payload;
  }
}
