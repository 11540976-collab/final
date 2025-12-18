import { WeatherData, ExchangeRate } from '../types';

// Fetch Weather from Open-Meteo (Free, No API Key required)
export const fetchWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    const data = await response.json();
    
    if (data.current_weather) {
      return {
        temperature: data.current_weather.temperature,
        weatherCode: data.current_weather.weathercode,
        isDay: data.current_weather.is_day === 1,
        windSpeed: data.current_weather.windspeed
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
};

// Fetch Exchange Rates (Base: USD, then convert to TWD perspective)
// Using open.er-api.com which is free and CORS friendly
export const fetchExchangeRates = async (): Promise<ExchangeRate[]> => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/TWD');
    const data = await response.json();

    if (data && data.rates) {
      // Data is TWD base. So data.rates.USD means 1 TWD = X USD.
      // We want to show 1 USD = Y TWD, so we invert it or use the value directly if the API supported generic base easily.
      // Actually open.er-api supports base.
      
      const targets = ['USD', 'JPY', 'EUR', 'CNY'];
      const rates: ExchangeRate[] = targets.map(currency => {
        const rate = data.rates[currency];
        // data.rates[USD] is how much USD you get for 1 TWD.
        // We usually want to see "1 USD = 32 TWD".
        // So we calculate 1 / rate.
        return {
          currency,
          rate: rate ? 1 / rate : 0
        };
      });
      
      return rates;
    }
    return [];
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return [];
  }
};