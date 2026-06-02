import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl =
    process.env.AI_SERVICE_URL || 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Calculates the centroid of a series of coordinates using the Python FastAPI GIS service.
   * Coordinates should be formatted as array of [longitude, latitude].
   */
  async getCentroid(coordinates: number[][]): Promise<[number, number]> {
    try {
      this.logger.log(
        `Requesting centroid calculation for ${coordinates.length} points from Python service`,
      );
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/api/v1/spatial/analyze`, {
          coordinates,
          operation: 'centroid',
        }),
      );
      return response.data.result.centroid;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to calculate centroid from Python service: ${axiosError.message}`,
      );
      throw new BadGatewayException(
        'Python AI & GIS service is currently unreachable.',
      );
    }
  }

  /**
   * Calculates the bounding box of a list of coordinates.
   */
  async getBoundingBox(coordinates: number[][]): Promise<any> {
    try {
      this.logger.log(
        `Requesting bounding box calculation from Python service`,
      );
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/api/v1/spatial/analyze`, {
          coordinates,
          operation: 'bounding_box',
        }),
      );
      return response.data.result;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to calculate bounding box: ${axiosError.message}`,
      );
      throw new BadGatewayException(
        'Python AI & GIS service is currently unreachable.',
      );
    }
  }

  /**
   * Queries the advanced Python RAG pipeline.
   */
  async queryRAG(
    query: string,
    contextDocuments: string[] = [],
  ): Promise<string> {
    try {
      this.logger.log(`Querying Python RAG pipeline for: "${query}"`);
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/api/v1/ai/rag`, {
          query,
          context_documents: contextDocuments,
        }),
      );
      return response.data.answer;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error(
        `Failed to query Python RAG pipeline: ${axiosError.message}`,
      );
      throw new BadGatewayException(
        'Python AI & GIS service RAG pipeline failed or is unreachable.',
      );
    }
  }
}
