import { CreateGenreInput } from '../../dto/genres.dto';

export const mockTag: CreateGenreInput = {
  coverImage: 'tagImage.jpg',
  name: 'new tag',
  restricted: false,
};

export const mockUpdateTag: CreateGenreInput = {
  coverImage: 'tagImage.jpg',
  name: 'new tag 2',
  restricted: true,
};
