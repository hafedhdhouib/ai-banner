import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { GeminiService } from './services/gemini.service';

interface Banner {
  imageUrl: string;
  aspectRatio: string;
  name: string;
}

type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

interface BannerFormat {
    name: string;
    aspectRatio: AspectRatio;
    description: string;
}

interface DesignTemplate {
  name: string;
  description: string;
  icon: string; // SVG path data
  promptFragment: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class AppComponent {
  private readonly geminiService = inject(GeminiService);

  productDescription = signal('A high-performance electric mountain bike with a sleek carbon fiber frame, long-lasting battery, and all-terrain tires.');
  productUrl = signal('www.electricbikes.com/peak-rider-x');
  generatedBanners = signal<Banner[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  readonly designTemplates: readonly DesignTemplate[] = [
    {
      name: 'Minimalist & Clean',
      description: 'Focus on whitespace, simplicity, and the core product.',
      icon: `M3.75 6A2.25 2.25 0 001.5 8.25v7.5A2.25 2.25 0 003.75 18h16.5A2.25 2.25 0 0022.5 15.75v-7.5A2.25 2.25 0 0020.25 6H3.75z`,
      promptFragment: `The design style must be minimalist and clean. Emphasize negative space, use a simple and muted color palette, and focus on the product as the single hero element. The overall feeling should be modern, airy, and sophisticated.`
    },
    {
      name: 'Bold & Vibrant',
      description: 'Use energetic colors and dynamic layouts to grab attention.',
      icon: `M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z`,
      promptFragment: `The design style must be bold and vibrant. Use a high-contrast, energetic color palette with dynamic shapes and a layout that creates a sense of excitement and movement. The ad should be eye-catching and demand attention.`
    },
    {
      name: 'Elegant & Luxurious',
      description: 'Sophisticated look with premium textures and refined fonts.',
      icon: `M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z`,
      promptFragment: `The design style must be elegant and luxurious. Use a rich, sophisticated color palette (like deep blues, golds, or silvers), premium textures (like marble or silk), and a sense of classic, high-end design. The product should look aspirational and premium.`
    },
    {
      name: 'Futuristic & Techy',
      description: 'Sleek, modern aesthetic with neon accents and abstract graphics.',
      icon: `M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V8.25a2.25 2.25 0 00-2.25-2.25H8.25a2.25 2.25 0 00-2.25 2.25v7.5a2.25 2.25 0 002.25 2.25z`,
      promptFragment: `The design style must be futuristic and tech-focused. Incorporate elements like glowing neon lines, abstract digital patterns, dark backgrounds with bright accents, and a sleek, high-tech aesthetic. The ad should feel innovative and cutting-edge.`
    },
  ];

  selectedTemplate = signal<DesignTemplate>(this.designTemplates[0]);

  readonly bannerFormats: readonly BannerFormat[] = [
    { name: 'Leaderboard / Banner', aspectRatio: '16:9', description: 'Wide format for top of page' },
    { name: 'Medium Rectangle', aspectRatio: '4:3', description: 'Versatile, common format' },
    { name: 'Square', aspectRatio: '1:1', description: 'Ideal for social media feeds' },
    { name: 'Portrait', aspectRatio: '3:4', description: 'Vertical format for sidebars' },
    { name: 'Skyscraper', aspectRatio: '9:16', description: 'Tall format for mobile screens' },
  ];

  updateDescription(event: Event) {
    this.productDescription.set((event.target as HTMLTextAreaElement).value);
  }

  updateUrl(event: Event) {
    this.productUrl.set((event.target as HTMLInputElement).value);
  }

  selectTemplate(template: DesignTemplate) {
    this.selectedTemplate.set(template);
  }

  async generateBanners() {
    if (this.isLoading() || !this.productDescription().trim()) {
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.generatedBanners.set([]);

    const basePrompt = `
      Create a visually stunning, professional banner ad for a product.
      The ad should be clean, modern, and eye-catching, suitable for a high-end brand.
      Avoid text overlays, as text will be added later. Focus on compelling product imagery and a suitable background.
      
      Product Description: "${this.productDescription()}"
      Product Website (for context): "${this.productUrl()}"

      IMPORTANT DESIGN STYLE: ${this.selectedTemplate().promptFragment}
    `;

    try {
      const bannerPromises = this.bannerFormats.map(format =>
        this.geminiService.generateBannerImage(
          `${basePrompt}\nGenerate the ad in a ${format.aspectRatio} aspect ratio, suitable for a "${format.name}" ad format.`,
          format.aspectRatio
        ).then(imageUrl => ({
          imageUrl,
          aspectRatio: format.aspectRatio,
          name: format.name
        }))
      );

      const results = await Promise.allSettled(bannerPromises);

      const successfulBanners: Banner[] = [];
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          successfulBanners.push(result.value);
        } else {
          console.error('Failed to generate a banner:', result.reason);
        }
      });
      
      this.generatedBanners.set(successfulBanners);

      if (successfulBanners.length < this.bannerFormats.length) {
          this.error.set(`Could not generate all banner formats. Only ${successfulBanners.length} of ${this.bannerFormats.length} were successful.`);
      }

    } catch (e) {
      console.error(e);
      this.error.set(e instanceof Error ? e.message : 'An unknown error occurred during generation.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
